const path = require("path");
const { readJsonFile, writeJsonFile } = require("../utils/fileStore");
const logger = require("../utils/logger");

const scheduleFilePath = path.join(process.cwd(), "server", "data", "scheduled_messages.json");

function createScheduleService({ store, whatsappService }) {
  let scheduledItems = [];
  let checkIntervalTimer = null;

  async function initialize() {
    try {
      const saved = await readJsonFile(scheduleFilePath, []);
      scheduledItems = Array.isArray(saved) ? saved : [];
      store.setScheduledMessages(scheduledItems);
      startCheckLoop();
      logger.info("Schedule service initialized", { totalScheduled: scheduledItems.length });
    } catch (error) {
      logger.error("Failed to initialize Schedule service", { error: error.message });
    }
  }

  function startCheckLoop() {
    if (checkIntervalTimer) {
      clearInterval(checkIntervalTimer);
    }

    // Check for due messages every 15 seconds
    checkIntervalTimer = setInterval(() => {
      processDueMessages().catch((err) => {
        logger.error("Error processing scheduled messages loop", { error: err.message });
      });
    }, 15000);
  }

  async function save() {
    try {
      await writeJsonFile(scheduleFilePath, scheduledItems);
      store.setScheduledMessages(scheduledItems);
    } catch (error) {
      logger.error("Failed to save scheduled messages", { error: error.message });
    }
  }

  async function processDueMessages() {
    const now = new Date();

    for (const item of scheduledItems) {
      if (item.status !== "pending") {
        continue;
      }

      const sendAtDate = new Date(item.sendAt);

      if (sendAtDate <= now) {
        logger.info("Executing scheduled message", { id: item.id, chatId: item.chatId, chatName: item.chatName });

        try {
          if (!whatsappService || typeof whatsappService.sendManualMessage !== "function") {
            throw new Error("WhatsApp service is not available");
          }

          await whatsappService.sendManualMessage(item.chatId, item.text);
          item.status = "sent";
          item.executedAt = new Date().toISOString();
          logger.info("Successfully sent scheduled message", { id: item.id });
        } catch (error) {
          item.status = "failed";
          item.errorReason = error.message || "Failed to deliver message";
          item.executedAt = new Date().toISOString();
          logger.error("Failed to send scheduled message", { id: item.id, error: error.message });
        }

        await save();
      }
    }
  }

  async function createScheduledMessage({ chatId, chatName, text, sendAt }) {
    if (!chatId || !text || !sendAt) {
      throw new Error("Chat, message text, and scheduled time are required");
    }

    const sendAtDate = new Date(sendAt);
    if (isNaN(sendAtDate.getTime())) {
      throw new Error("Invalid schedule date/time format");
    }

    if (sendAtDate <= new Date()) {
      throw new Error("Scheduled time must be in the future");
    }

    const newItem = {
      id: `sched_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      chatId,
      chatName: chatName || chatId,
      text: String(text).trim(),
      sendAt: sendAtDate.toISOString(),
      status: "pending",
      createdAt: new Date().toISOString(),
      executedAt: null,
      errorReason: null
    };

    scheduledItems.unshift(newItem);
    await save();
    logger.info("Created new scheduled message", { id: newItem.id, sendAt: newItem.sendAt });
    return newItem;
  }

  async function cancelScheduledMessage(id) {
    const itemIndex = scheduledItems.findIndex((item) => item.id === id);

    if (itemIndex < 0) {
      throw new Error("Scheduled message not found");
    }

    if (scheduledItems[itemIndex].status === "sent") {
      throw new Error("Cannot cancel a message that has already been sent");
    }

    scheduledItems[itemIndex].status = "canceled";
    scheduledItems[itemIndex].executedAt = new Date().toISOString();
    await save();
    logger.info("Canceled scheduled message", { id });
    return scheduledItems[itemIndex];
  }

  async function deleteScheduledMessage(id) {
    const previousLength = scheduledItems.length;
    scheduledItems = scheduledItems.filter((item) => item.id !== id);

    if (scheduledItems.length === previousLength) {
      throw new Error("Scheduled message not found");
    }

    await save();
    logger.info("Deleted scheduled message", { id });
    return true;
  }

  function getScheduledMessages() {
    return scheduledItems;
  }

  return {
    initialize,
    createScheduledMessage,
    cancelScheduledMessage,
    deleteScheduledMessage,
    getScheduledMessages,
    processDueMessages
  };
}

module.exports = {
  createScheduleService
};
