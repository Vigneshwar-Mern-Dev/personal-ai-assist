const fs = require("fs");
const path = require("path");
const { isPersonalChat, isPersonalChatId, shouldAutoReplyToContact } = require("../utils/chatFilters");
const { createWhatsAppClient } = require("../bot/client");
const { createAutoReplyService } = require("./autoReplyService");
const logger = require("../utils/logger");
const QRCode = require("qrcode");
const { authPath, cachePath } = require("../config/runtimePaths");

// Reconnect configuration
const RECONNECT_BASE_DELAY_MS = 5000;
const RECONNECT_MAX_DELAY_MS = 10 * 60 * 1000; // 10 minutes
const RECONNECT_MAX_ATTEMPTS = 20;

function createWhatsAppService({ store, openAIService }) {
  let client = null;
  let initializingPromise = null;
  let reconnectTimer = null;
  let chatSyncTimer = null;
  let manualActionInProgress = false;

  const autoReplyService = createAutoReplyService({
    store,
    openAIService,
    getClient: () => client
  });

  async function buildChatSnapshot() {
    if (!client) {
      return;
    }

    const chats = await client.getChats();
    const visibleChats = chats
      .filter(isPersonalChat)
      .sort((left, right) => (right.timestamp || 0) - (left.timestamp || 0))
      .slice(0, 50)
      .map((chat) => ({
        id: chat.id._serialized,
        name: chat.name || chat.formattedTitle || chat.id.user,
        lastMessage: chat.lastMessage?.body || "",
        lastMessageAt: chat.timestamp ? new Date(chat.timestamp * 1000).toISOString() : null,
        unreadCount: chat.unreadCount || 0,
        aiReplied: false
      }));

    store.setChatsFromWhatsapp(visibleChats);
  }

  async function destroyClient() {
    if (!client) {
      return;
    }

    clearChatSyncTimer();

    const currentClient = client;
    client = null;

    try {
      await currentClient.destroy();
    } catch (error) {
      store.setLastError(error.message || "Failed to destroy WhatsApp client");
      logger.warn("WhatsApp client destroy error", { error: error.message });
    }
  }

  function clearChatSyncTimer() {
    if (chatSyncTimer) {
      clearInterval(chatSyncTimer);
      chatSyncTimer = null;
    }
  }

  function clearReconnectTimer() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function startChatSyncLoop() {
    clearChatSyncTimer();
    chatSyncTimer = setInterval(() => {
      buildChatSnapshot().catch((error) => {
        logger.warn("Background chat sync failed", { error: error.message });
        store.setLastError(error.message || "Background chat sync failed");
      });
    }, 45000);
  }

  /**
   * Exponential backoff reconnect with a hard cap on attempts.
   * Delay doubles each attempt: 5 s, 10 s, 20 s … up to 10 min.
   */
  function scheduleReconnect(reason = "Connection lost") {
    if (manualActionInProgress) {
      return;
    }

    const currentAttempts = store.getSnapshot().session.reconnectAttempts;

    if (currentAttempts >= RECONNECT_MAX_ATTEMPTS) {
      logger.error("Max reconnect attempts reached — manual intervention required", {
        attempts: currentAttempts,
        reason
      });
      store.updateStatus("disconnected", {
        qrCode: null,
        lastError: `Reconnect abandoned after ${RECONNECT_MAX_ATTEMPTS} attempts: ${reason}`
      });
      return;
    }

    clearReconnectTimer();
    store.incrementReconnectAttempts();

    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * Math.pow(2, currentAttempts),
      RECONNECT_MAX_DELAY_MS
    );

    store.updateStatus("reconnecting", {
      qrCode: null,
      lastError: reason
    });

    logger.info("Scheduling reconnect", {
      attempt: currentAttempts + 1,
      delayMs: delay,
      reason
    });

    reconnectTimer = setTimeout(() => {
      initialize({ forceRestart: true }).catch((error) => {
        logger.error("Reconnect attempt failed", { error: error.message });
        store.setLastError(error.message || "Reconnect failed");
      });
    }, delay);
  }

  function bindClientEvents(currentClient) {
    currentClient.on("qr", async (qrText) => {
      try {
        const qrCode = await QRCode.toDataURL(qrText);
        store.setQrCodeStatus(qrCode);
      } catch (error) {
        logger.error("Failed to render QR code", { error: error.message });
        store.setLastError(error.message || "Failed to render QR code");
      }
    });

    currentClient.on("authenticated", () => {
      logger.info("WhatsApp authenticated");
      store.syncSessionPresence();
    });

    currentClient.on("ready", async () => {
      try {
        clearReconnectTimer();
        store.resetReconnectAttempts();
        store.setConnectedClient(currentClient.info || {});
        startChatSyncLoop();
        await buildChatSnapshot().catch((err) => {
          logger.warn("Initial chat sync non-fatal warning", { error: err?.message || String(err) });
        });
        logger.info("WhatsApp client ready", { clientName: currentClient.info?.pushname });
      } catch (error) {
        logger.error("Failed to prepare WhatsApp client", { error: error?.message || String(error) });
        store.setLastError(error?.message || "Failed to prepare WhatsApp client");
      }
    });

    currentClient.on("auth_failure", (message) => {
      logger.warn("WhatsApp auth failure", { message: String(message) });
      store.updateStatus("disconnected", {
        lastError: String(message || "Authentication failed")
      });
      scheduleReconnect("Authentication failed");
    });

    currentClient.on("disconnected", (reason) => {
      const reasonStr = String(reason || "Disconnected");
      logger.warn("WhatsApp disconnected", { reason: reasonStr });
      store.updateStatus("disconnected", {
        lastError: reasonStr
      });
      scheduleReconnect(reasonStr);
    });

    currentClient.on("message", async (message) => {
      try {
        await autoReplyService.handleIncomingMessage(message);
      } catch (error) {
        logger.error("Failed to process incoming message", { error: error?.message || String(error) });
        store.setLastError(error?.message || "Failed to process message");
      }
    });
  }

  async function initialize({ forceRestart = false } = {}) {
    clearReconnectTimer();

    if (initializingPromise) {
      return initializingPromise;
    }

    initializingPromise = (async () => {
      if (forceRestart) {
        store.updateStatus("reconnecting");
        const previousManualActionState = manualActionInProgress;
        manualActionInProgress = true;

        try {
          await destroyClient();
        } finally {
          manualActionInProgress = previousManualActionState;
          clearReconnectTimer();
        }
      }

      if (client) {
        return client;
      }

      client = createWhatsAppClient();
      bindClientEvents(client);
      await client.initialize();
      return client;
    })();

    try {
      return await initializingPromise;
    } finally {
      initializingPromise = null;
    }
  }

  async function reconnect() {
    manualActionInProgress = false;
    store.resetReconnectAttempts(); // Manual reconnect resets the backoff counter
    store.updateStatus("reconnecting", { qrCode: null });
    await initialize({ forceRestart: true });
  }

  async function logout() {
    if (!client) {
      return;
    }

    manualActionInProgress = true;
    clearReconnectTimer();

    try {
      await client.logout();
    } finally {
      await destroyClient();
      store.updateStatus("disconnected", {
        connectedAt: null,
        qrCode: null,
        lastError: null,
        clientName: null,
        phoneNumber: null
      });
      store.syncSessionPresence();
      manualActionInProgress = false;
    }
  }

  async function resetSession() {
    manualActionInProgress = true;
    clearReconnectTimer();

    try {
      await destroyClient();
      await fs.promises.rm(authPath, { recursive: true, force: true });
      await fs.promises.rm(cachePath, { recursive: true, force: true });

      store.updateStatus("disconnected", {
        connectedAt: null,
        qrCode: null,
        lastError: null,
        clientName: null,
        phoneNumber: null
      });
      store.syncSessionPresence();
    } finally {
      manualActionInProgress = false;
    }

    await reconnect();
  }

  async function regenerateQr() {
    await reconnect();
  }

  async function sendManualMessage(chatId, text) {
    if (!client) {
      throw new Error("WhatsApp client is not connected");
    }

    const safeText = String(text || "").trim();
    if (!safeText) {
      throw new Error("Message text cannot be empty");
    }

    await client.sendMessage(chatId, safeText);

    const existingChat = store.getSnapshot().chats.find((c) => c.id === chatId);
    const chatName = existingChat?.name || chatId;

    store.recordMessage({
      id: `manual-${Date.now()}`,
      chatId,
      chatName,
      body: safeText,
      createdAt: new Date().toISOString(),
      unreadCount: 0,
      direction: "outgoing",
      aiReplied: false
    });

    return true;
  }

  return {
    buildChatSnapshot,
    getClient: () => client,
    initialize,
    logout,
    reconnect,
    regenerateQr,
    resetSession,
    sendManualMessage
  };
}

module.exports = {
  createWhatsAppService
};
