const express = require("express");
const { createChatRoutes } = require("./chatRoutes");
const { createReplyScriptRoutes } = require("./replyScriptRoutes");
const { createScheduleRoutes } = require("./scheduleRoutes");
const { createSessionRoutes } = require("./sessionRoutes");
const { createSettingsRoutes } = require("./settingsRoutes");

function createApiRouter({ store, whatsappService, scheduleService }) {
  const router = express.Router();

  router.get("/app", (request, response) => {
    response.json({
      success: true,
      snapshot: store.getSnapshot()
    });
  });

  router.use("/chats", createChatRoutes({ store, whatsappService }));
  router.use("/reply-scripts", createReplyScriptRoutes());
  router.use("/schedule", createScheduleRoutes({ scheduleService, store }));
  router.use("/session", createSessionRoutes({ store, whatsappService }));
  router.use("/settings", createSettingsRoutes({ store }));

  return router;
}

module.exports = {
  createApiRouter
};
