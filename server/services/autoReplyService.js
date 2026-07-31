const { randomNumberInRange, sleep } = require("../utils/delay");
const {
  isPersonalChat,
  isPersonalChatId,
  shouldAutoReplyToContact
} = require("../utils/chatFilters");
const { sanitizeReplyText } = require("../utils/replySanitizer");
const { resolveScriptedReply } = require("./replyScriptService");
const logger = require("../utils/logger");

function createAutoReplyService({ store, openAIService, getClient }) {
  const pendingReplies = new Map();
  const collectionWindowMs = 2500;

  async function handleIncomingMessage(message) {
    const body = message.body?.trim();

    if (!body || message.fromMe) {
      return;
    }

    if (!isPersonalChatId(message.from)) {
      logger.info("Ignored non-personal chat", { chatId: message.from || "unknown" });
      return;
    }

    let chat = null;
    let contact = null;

    try {
      chat = await message.getChat();
    } catch (err) {
      logger.warn("Failed to get chat object for incoming message", { chatId: message.from, error: err?.message || String(err) });
    }

    try {
      contact = await message.getContact();
    } catch (err) {
      logger.warn("Failed to get contact object for incoming message", { chatId: message.from, error: err?.message || String(err) });
    }

    if (chat && !isPersonalChat(chat)) {
      logger.info("Ignored non-personal chat object", {
        chatId: chat.id?._serialized || message.from
      });
      return;
    }

    const contactName =
      contact?.pushname ||
      contact?.name ||
      chat?.name ||
      contact?.number ||
      (message.from ? message.from.split("@")[0] : "Contact");

    const incomingTimestamp = message.timestamp
      ? new Date(message.timestamp * 1000).toISOString()
      : new Date().toISOString();

    store.recordMessage({
      id: message.id?.id || `msg-${Date.now()}`,
      chatId: message.from,
      chatName: contactName,
      body,
      createdAt: incomingTimestamp,
      unreadCount: chat?.unreadCount || 1,
      direction: "incoming",
      aiReplied: false
    });

    const settings = store.getSettings();

    if (!settings.aiEnabled) {
      logger.info("Auto-reply disabled in settings", { chatId: message.from });
      return;
    }

    if (store.isChatPaused(message.from)) {
      logger.info("Skipped auto-reply for paused chat (Human Handoff)", { chatId: message.from });
      return;
    }

    if (chat && contact && !shouldAutoReplyToContact({ chat, contact, contactName })) {
      logger.info("Skipped auto-reply for protected contact", {
        contactName,
        chatId: message.from
      });
      return;
    }

    logger.info("Queueing auto-reply for incoming message", {
      chatId: message.from,
      contactName,
      body
    });

    queueReply({
      chatId: message.from,
      messageId: message.id?.id || `msg-${Date.now()}`,
      body,
      chatName: contactName,
      unreadCount: chat?.unreadCount || 1
    });
  }

  function queueReply({ chatId, messageId, body, chatName, unreadCount }) {
    const existingReply = pendingReplies.get(chatId);
    const nextReply = existingReply || {
      chatId,
      messageIds: [],
      bodies: [],
      chatName,
      unreadCount: unreadCount || 0,
      timer: null,
      queuedAt: new Date().toISOString()
    };

    nextReply.messageIds.push(messageId);
    nextReply.bodies.push(body);
    nextReply.chatName = chatName;
    nextReply.unreadCount = unreadCount || nextReply.unreadCount || 0;
    nextReply.queuedAt = new Date().toISOString();

    if (nextReply.timer) {
      clearTimeout(nextReply.timer);
    }

    nextReply.timer = setTimeout(() => {
      flushReply(chatId).catch((error) => {
        store.clearPendingReply(chatId);
        logger.error("Failed to process queued reply", {
          chatId,
          error: error.message
        });
        store.setLastError(error.message || "Failed to process queued reply");
      });
    }, collectionWindowMs);

    pendingReplies.set(chatId, nextReply);
    store.setPendingReply(chatId, {
      chatName,
      messageCount: nextReply.bodies.length,
      queuedAt: nextReply.queuedAt
    });
  }

  async function flushReply(chatId) {
    const pendingReply = pendingReplies.get(chatId);

    if (!pendingReply) {
      return;
    }

    pendingReplies.delete(chatId);

    if (pendingReply.timer) {
      clearTimeout(pendingReply.timer);
    }

    const settings = store.getSettings();

    if (!settings.aiEnabled) {
      store.clearPendingReply(chatId);
      return;
    }

    const client = getClient();

    if (!client) {
      store.clearPendingReply(chatId);
      return;
    }

    const combinedMessage = pendingReply.bodies.join("\n").slice(0, 1500);
    const startedAt = Date.now();
    let chat = null;

    try {
      try {
        chat = await client.getChatById(chatId);
      } catch (err) {
        logger.warn("Could not fetch chat object by ID during flush, proceeding with direct send", { chatId, error: err?.message || String(err) });
      }

      const conversationHistory = store.getRecentMessagesForChat(chatId, 10);
      const scriptedReply = await resolveScriptedReply({
        messageText: combinedMessage,
        classifyIntent: (intents) =>
          openAIService.classifyIntent({
            messageText: combinedMessage,
            contactName: pendingReply.chatName,
            conversationHistory,
            intents
          })
      });

      const replyText =
        scriptedReply?.replyText ||
        (await openAIService.generateReply({
          customPrompt: settings.customPrompt,
          messageText: combinedMessage,
          contactName: pendingReply.chatName,
          conversationHistory
        }));

      const safeReplyText = sanitizeReplyText(replyText);
      const targetDelay = randomNumberInRange(
        settings.replyDelayMinSeconds * 1000,
        settings.replyDelayMaxSeconds * 1000
      );
      const remainingDelay = Math.max(0, targetDelay - (Date.now() - startedAt));

      if (settings.typingSimulation && chat && typeof chat.sendStateTyping === "function") {
        try {
          await chat.sendStateTyping();
        } catch (err) {
          logger.warn("Typing simulation error ignored", { chatId });
        }
      }

      await sleep(remainingDelay);
      await client.sendMessage(chatId, safeReplyText);

      if (settings.typingSimulation && chat && typeof chat.clearState === "function") {
        try {
          await chat.clearState();
        } catch {
          // Suppress cleanup errors
        }
      }

      store.clearPendingReply(chatId);
      store.recordMessage({
        id: `${pendingReply.messageIds[pendingReply.messageIds.length - 1]}-ai`,
        chatId,
        chatName: pendingReply.chatName,
        body: safeReplyText,
        createdAt: new Date().toISOString(),
        unreadCount: 0,
        direction: "outgoing",
        aiReplied: true
      });

      logger.info("AI reply sent", {
        chatId,
        contactName: pendingReply.chatName,
        source: scriptedReply ? scriptedReply.source : "ai",
        latencyMs: Date.now() - startedAt
      });
    } catch (error) {
      store.clearPendingReply(chatId);

      if (settings.typingSimulation && chat && typeof chat.clearState === "function") {
        try {
          await chat.clearState();
        } catch {
          // Suppress cleanup errors — preserve the original failure context
        }
      }

      logger.error("Failed to send AI reply", {
        chatId,
        contactName: pendingReply.chatName,
        error: error.message
      });
      store.setLastError(error.message || "Failed to send AI reply");
    }
  }

  return {
    handleIncomingMessage
  };
}

module.exports = {
  createAutoReplyService
};
