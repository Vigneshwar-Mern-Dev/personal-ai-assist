"use client";

import { PageIntro } from "@/components/page-intro";
import { ScheduleManager } from "@/components/schedule-manager";

export default function SchedulePage() {
  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Schedule"
        title="Message Scheduling & Reminders"
        description="Plan automated WhatsApp messages, reminders, and broadcasts to deliver at exact dates and times."
      />

      <ScheduleManager />
    </div>
  );
}
