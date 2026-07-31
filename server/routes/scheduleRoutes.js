const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");

function createScheduleRoutes({ scheduleService, store }) {
  const router = express.Router();

  router.get("/", (request, response) => {
    response.json({
      success: true,
      scheduledMessages: scheduleService.getScheduledMessages()
    });
  });

  router.post("/", asyncHandler(async (request, response) => {
    const { chatId, chatName, text, sendAt } = request.body || {};

    const item = await scheduleService.createScheduledMessage({
      chatId,
      chatName,
      text,
      sendAt
    });

    response.json({
      success: true,
      item,
      snapshot: store.getSnapshot()
    });
  }));

  router.post("/:id/cancel", asyncHandler(async (request, response) => {
    const { id } = request.params;
    const item = await scheduleService.cancelScheduledMessage(id);

    response.json({
      success: true,
      item,
      snapshot: store.getSnapshot()
    });
  }));

  router.delete("/:id", asyncHandler(async (request, response) => {
    const { id } = request.params;
    await scheduleService.deleteScheduledMessage(id);

    response.json({
      success: true,
      message: "Scheduled message deleted",
      snapshot: store.getSnapshot()
    });
  }));

  return router;
}

module.exports = {
  createScheduleRoutes
};
