const EventEmitter = require("events");
const path = require("path");
const { authPath: authDirectoryPath } = require("../config/runtimePaths");
const { pathExists, readJsonFile, writeJsonFile } = require("../utils/fileStore");
const logger = require("../utils/logger");

const settingsFilePath = path.join(process.cwd(), "server", "data", "settings.json");
const messagesFilePath = path.join(process.cwd(), "server", "data", "messages.json");
const pausedChatsFilePath = path.join(process.cwd(), "server", "data", "paused_chats.json");

const defaultSettings = {
  aiEnabled: false,
  typingSimulation: true,
  replyDelayMinSeconds: 5,
  replyDelayMaxSeconds: 15,
  customPrompt:
    "You reply only to direct personal WhatsApp chats for Vignesh. Sound like a real Tamil friend texting casually in Tanglish and simple English. Keep replies short, natural, emotionally aware, and context-aware. Do not sound like a bot, assistant, company, teacher, or support agent. Use slang only when it fits. Do not overuse bro, macha, da, or emojis. If the person seems new or formal, reply casually as Vignesh's friend/PA and ask what they need. Never make commitments, share private info, or invent facts."
};

function normalizeDelay(value, fallbackValue, minimumValue = 0) {
  const nextValue = Number(value);

  if (!Number.isFinite(nextValue)) {
    return fallbackValue;
  }

  return Math.max(minimumValue, nextValue);
}

function normalizeBoolean(value, fallbackValue) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();

    if (["true", "1", "yes", "on"].includes(normalizedValue)) {
      return true;
    }

    if (["false", "0", "no", "off"].includes(normalizedValue)) {
      return false;
    }
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  return fallbackValue;
}

class AppStore extends EventEmitter {
  constructor() {
    super();
    this.state = {
      status: {
        value: "disconnected",
        qrCode: null,
        connectedAt: null,
        lastError: null,
        clientName: null,
        phoneNumber: null
      },
      settings: { ...defaultSettings },
      session: {
        hasLocalSession: false,
        reconnectAttempts: 0,
        lastActionAt: null
      },
      meta: {
        lastSnapshotAt: null,
        lastChatSyncAt: null,
        lastMessageAt: null,
        pendingReplies: []
      },
      chats: [],
      recentMessages: [],
      scheduledMessages: []
    };
    this.pausedChats = new Set();
    this.isSavingMessages = false;
    this.saveMessagesDebounceTimer = null;
  }

  async initialize() {
    const [savedSettings, savedMessages, savedPausedChats] = await Promise.all([
      readJsonFile(settingsFilePath, defaultSettings),
      readJsonFile(messagesFilePath, []),
      readJsonFile(pausedChatsFilePath, [])
    ]);

    this.state.settings = {
      ...defaultSettings,
      ...savedSettings
    };

    this.state.recentMessages = Array.isArray(savedMessages) ? savedMessages : [];
    this.pausedChats = new Set(Array.isArray(savedPausedChats) ? savedPausedChats : []);
    
    // Reconstruct chats from messages if possible
    this.reconstructChatsFromMessages();

    await this.updateSettings(this.state.settings);
    this.syncSessionPresence();
  }

  reconstructChatsFromMessages() {
    const chatMap = new Map();
    
    // Process messages from oldest to newest to keep lastMessageAt correct
    [...this.state.recentMessages].reverse().forEach(msg => {
      chatMap.set(msg.chatId, {
        id: msg.chatId,
        name: msg.chatName,
        lastMessage: msg.body,
        lastMessageAt: msg.createdAt,
        unreadCount: msg.unreadCount || 0,
        aiReplied: msg.aiReplied,
        lastDirection: msg.direction,
        pendingReply: false,
        pendingReplyCount: 0,
        isPaused: this.pausedChats.has(msg.chatId)
      });
    });

    this.state.chats = Array.from(chatMap.values())
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
      .slice(0, 50);
  }

  saveMessages() {
    if (this.saveMessagesDebounceTimer) {
      clearTimeout(this.saveMessagesDebounceTimer);
    }

    this.saveMessagesDebounceTimer = setTimeout(async () => {
      if (this.isSavingMessages) return;
      this.isSavingMessages = true;
      try {
        await writeJsonFile(messagesFilePath, this.state.recentMessages);
      } catch (error) {
        logger.error("Failed to save messages", { error: error.message });
      } finally {
        this.isSavingMessages = false;
      }
    }, 2000);
  }

  async savePausedChats() {
    try {
      await writeJsonFile(pausedChatsFilePath, Array.from(this.pausedChats));
    } catch (error) {
      logger.error("Failed to save paused chats", { error: error.message });
    }
  }

  getSettings() {
    return { ...this.state.settings };
  }

  isChatPaused(chatId) {
    return this.pausedChats.has(chatId);
  }

  async toggleChatPause(chatId, isPaused) {
    if (isPaused) {
      this.pausedChats.add(chatId);
      // If pausing, we should also clear any pending reply in the queue
      this.clearPendingReply(chatId);
    } else {
      this.pausedChats.delete(chatId);
    }

    await this.savePausedChats();

    const existingChatIndex = this.state.chats.findIndex((chat) => chat.id === chatId);
    if (existingChatIndex >= 0) {
      this.state.chats[existingChatIndex].isPaused = isPaused;
      this.emitSnapshot();
    }
  }

  getRecentMessagesForChat(chatId, limit = 10) {
    return this.state.recentMessages
      .filter((message) => message.chatId === chatId)
      .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
      .slice(-limit)
      .map((message) => ({
        direction: message.direction,
        body: message.body,
        createdAt: message.createdAt
      }));
  }

  setScheduledMessages(scheduledMessages) {
    this.state.scheduledMessages = Array.isArray(scheduledMessages) ? scheduledMessages : [];
    this.emitSnapshot();
  }

  getSnapshot() {
    const scheduled = this.state.scheduledMessages || [];
    return {
      ...this.state,
      stats: {
        totalChats: this.state.chats.length,
        unreadChats: this.state.chats.filter((chat) => chat.unreadCount > 0).length,
        aiRepliedCount: this.state.recentMessages.filter((message) => message.aiReplied).length,
        pendingReplies: this.state.meta.pendingReplies.length,
        scheduledPending: scheduled.filter((s) => s.status === "pending").length,
        scheduledTotal: scheduled.length
      }
    };
  }

  emitSnapshot() {
    this.state.meta.lastSnapshotAt = new Date().toISOString();
    this.emit("snapshot", this.getSnapshot());
  }

  syncSessionPresence({ emit = true } = {}) {
    this.state.session.hasLocalSession = pathExists(authDirectoryPath);

    if (emit) {
      this.emitSnapshot();
    }
  }

  async updateSettings(nextSettings) {
    const minDelay = normalizeDelay(
      nextSettings.replyDelayMinSeconds ?? this.state.settings.replyDelayMinSeconds,
      this.state.settings.replyDelayMinSeconds,
      0
    );
    const maxDelay = normalizeDelay(
      nextSettings.replyDelayMaxSeconds ?? this.state.settings.replyDelayMaxSeconds,
      this.state.settings.replyDelayMaxSeconds,
      minDelay
    );
    const trimmedPrompt = String(nextSettings.customPrompt ?? this.state.settings.customPrompt).trim() || defaultSettings.customPrompt;
    const safePrompt = trimmedPrompt.slice(0, 3000);

    this.state.settings = {
      ...this.state.settings,
      ...nextSettings,
      aiEnabled: normalizeBoolean(nextSettings.aiEnabled, this.state.settings.aiEnabled),
      typingSimulation: normalizeBoolean(nextSettings.typingSimulation, this.state.settings.typingSimulation),
      replyDelayMinSeconds: minDelay,
      replyDelayMaxSeconds: maxDelay,
      customPrompt: safePrompt
    };

    await writeJsonFile(settingsFilePath, this.state.settings);
    this.emitSnapshot();
    return this.getSettings();
  }

  updateStatus(value, extra = {}) {
    this.state.status = {
      ...this.state.status,
      ...extra,
      value
    };
    this.state.session.lastActionAt = new Date().toISOString();
    this.emitSnapshot();
  }

  setQrCodeStatus(qrCode) {
    this.state.status = {
      ...this.state.status,
      value: "disconnected",
      qrCode,
      connectedAt: null,
      lastError: null,
      clientName: null,
      phoneNumber: null
    };
    this.state.session.lastActionAt = new Date().toISOString();
    this.emitSnapshot();
  }

  setConnectedClient(info = {}) {
    this.state.status = {
      ...this.state.status,
      value: "connected",
      qrCode: null,
      connectedAt: new Date().toISOString(),
      lastError: null,
      clientName: info.pushname || null,
      phoneNumber: info.wid?.user || null
    };
    this.syncSessionPresence({ emit: false });
    this.emitSnapshot();
  }

  setLastError(errorMessage) {
    this.state.status.lastError = errorMessage;
    this.emitSnapshot();
  }

  incrementReconnectAttempts() {
    this.state.session.reconnectAttempts += 1;
    this.state.session.lastActionAt = new Date().toISOString();
    this.emitSnapshot();
  }

  resetReconnectAttempts() {
    this.state.session.reconnectAttempts = 0;
    this.emitSnapshot();
  }

  setChatsFromWhatsapp(chats) {
    const previousChats = new Map(this.state.chats.map((chat) => [chat.id, chat]));

    this.state.chats = chats.map((chat) => ({
      aiReplied: previousChats.get(chat.id)?.aiReplied || false,
      pendingReply: previousChats.get(chat.id)?.pendingReply || false,
      pendingReplyCount: previousChats.get(chat.id)?.pendingReplyCount || 0,
      isPaused: this.pausedChats.has(chat.id),
      ...chat
    }));

    this.state.meta.lastChatSyncAt = new Date().toISOString();
    this.emitSnapshot();
  }

  recordMessage(message) {
    const nextMessage = {
      ...message,
      createdAt: message.createdAt || new Date().toISOString()
    };

    this.state.meta.lastMessageAt = nextMessage.createdAt;
    this.state.recentMessages = [nextMessage, ...this.state.recentMessages]
      .slice(0, 1000) // Keep more messages in history for persistence
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

    const existingChatIndex = this.state.chats.findIndex((chat) => chat.id === message.chatId);
    const previousChat = existingChatIndex >= 0 ? this.state.chats[existingChatIndex] : null;
    const nextChat = {
      id: message.chatId,
      name: message.chatName,
      lastMessage: message.body,
      lastMessageAt: nextMessage.createdAt,
      unreadCount: message.unreadCount ?? 0,
      aiReplied: message.aiReplied,
      lastDirection: message.direction,
      pendingReply: previousChat?.pendingReply || false,
      pendingReplyCount: previousChat?.pendingReplyCount || 0,
      isPaused: this.pausedChats.has(message.chatId)
    };

    if (existingChatIndex >= 0) {
      this.state.chats[existingChatIndex] = {
        ...this.state.chats[existingChatIndex],
        ...nextChat
      };
    } else {
      this.state.chats.unshift(nextChat);
    }

    this.state.chats = this.state.chats
      .sort((left, right) => new Date(right.lastMessageAt || 0).getTime() - new Date(left.lastMessageAt || 0).getTime())
      .slice(0, 50);

    this.saveMessages();
    this.emitSnapshot();
  }

  setPendingReply(chatId, pendingReply) {
    const nextPendingReplies = this.state.meta.pendingReplies.filter((item) => item.chatId !== chatId);
    nextPendingReplies.push({
      ...pendingReply,
      chatId
    });

    this.state.meta.pendingReplies = nextPendingReplies.sort(
      (left, right) => new Date(right.queuedAt).getTime() - new Date(left.queuedAt).getTime()
    );

    const existingChatIndex = this.state.chats.findIndex((chat) => chat.id === chatId);

    if (existingChatIndex >= 0) {
      this.state.chats[existingChatIndex] = {
        ...this.state.chats[existingChatIndex],
        pendingReply: true,
        pendingReplyCount: pendingReply.messageCount
      };
    }

    this.emitSnapshot();
  }

  clearPendingReply(chatId) {
    this.state.meta.pendingReplies = this.state.meta.pendingReplies.filter((item) => item.chatId !== chatId);

    const existingChatIndex = this.state.chats.findIndex((chat) => chat.id === chatId);

    if (existingChatIndex >= 0) {
      this.state.chats[existingChatIndex] = {
        ...this.state.chats[existingChatIndex],
        pendingReply: false,
        pendingReplyCount: 0
      };
    }

    this.emitSnapshot();
  }
}

function createAppStore() {
  return new AppStore();
}

module.exports = {
  createAppStore
};
