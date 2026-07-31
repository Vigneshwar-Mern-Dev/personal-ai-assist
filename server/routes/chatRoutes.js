const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");

function createChatRoutes({ store, whatsappService }) {
  const router = express.Router();

  router.get("/", (request, response) => {
    const snapshot = store.getSnapshot();
    response.json({
      success: true,
      chats: snapshot.chats,
      recentMessages: snapshot.recentMessages
    });
  });

  router.post("/:chatId/pause", asyncHandler(async (request, response) => {
    const { chatId } = request.params;
    if (!chatId) {
      return response.status(400).json({ success: false, message: "Chat ID required" });
    }
    
    await store.toggleChatPause(chatId, true);
    
    response.json({
      success: true,
      message: "AI paused for this chat",
      snapshot: store.getSnapshot()
    });
  }));

  router.post("/:chatId/resume", asyncHandler(async (request, response) => {
    const { chatId } = request.params;
    if (!chatId) {
      return response.status(400).json({ success: false, message: "Chat ID required" });
    }
    
    await store.toggleChatPause(chatId, false);
    
    response.json({
      success: true,
      message: "AI resumed for this chat",
      snapshot: store.getSnapshot()
    });
  }));

  router.post("/:chatId/send", asyncHandler(async (request, response) => {
    const { chatId } = request.params;
    const { message } = request.body || {};

    if (!chatId || !message) {
      return response.status(400).json({ success: false, message: "Chat ID and message text are required" });
    }

    if (!whatsappService || typeof whatsappService.sendManualMessage !== "function") {
      return response.status(500).json({ success: false, message: "WhatsApp service unavailable" });
    }

    await whatsappService.sendManualMessage(chatId, message);

    response.json({
      success: true,
      message: "Message sent successfully",
      snapshot: store.getSnapshot()
    });
  }));

  return router;
}

module.exports = {
  createChatRoutes
};
