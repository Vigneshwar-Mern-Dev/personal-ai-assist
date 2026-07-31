# 💬 Personal WhatsApp AI Assistant & Control Room

A modern, full-stack personal communication automation platform integrating **WhatsApp Web automation**, **Multi-AI provider failover** (`Groq`, `Gemini`, `OpenRouter`, `OpenAI`), **Smart Message Scheduling**, and a **Real-time Glassmorphic Control Dashboard**.

---

## ✨ Features

- 🤖 **AI Auto-Replies**: Automatic, context-aware casual replies for one-to-one personal chats.
- ⚡ **Multi-AI Provider Failover**: Automatic fallback chain (`Groq` ➔ `Gemini` ➔ `OpenRouter` ➔ `OpenAI`). If the primary provider hits a rate-limit or outage, secondary providers take over seamlessly.
- 📅 **Message Scheduling & Reminders**: Schedule one-time or recurring WhatsApp messages to any contact with date/time pickers, quick AI templates, live countdowns, and automated background execution.
- 🛑 **Human Mode (Pause AI)**: Pause AI per-chat for manual intervention. Chat pause states persist in storage across server restarts.
- 💬 **Direct Dashboard Messaging**: Send manual WhatsApp messages to any contact directly from the dashboard UI.
- 🛡️ **Anti-Ban Protections**: Randomized typing simulation, 5s–15s randomized delays, and automatic exclusion of groups, business contacts, telecom services, and banks (*SBI, HDFC, ICICI*).
- 🎨 **Glassmorphic UI**: Built with Next.js 14, Tailwind CSS, custom design tokens, animated live status indicators, and Socket.io real-time updates.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, Socket.io Client, Lucide React
- **Backend**: Node.js, Express, Socket.io, `whatsapp-web.js` (Puppeteer / Chromium)
- **AI Integrations**: `@google/generative-ai` (Gemini), `openai` (Groq, OpenRouter, OpenAI)
- **Process & Deployment**: PM2, Docker (Multi-stage build), dumb-init

---

## 📁 Project Structure

```text
vr-2/
├── app/                  # Next.js 14 App Router (Chats, Auto-Reply, Schedule, Session, Settings)
├── components/           # UI Components (AppShell, ChatList, ScheduleManager, SessionPanel, etc.)
├── lib/                  # Shared API utilities and formatting helpers
├── server/
│   ├── ai/               # AI Service provider integration & failover logic
│   ├── bot/              # Puppeteer Chromium client setup for whatsapp-web.js
│   ├── data/             # Persistent JSON storage (settings, messages, paused_chats, scheduled_messages)
│   ├── routes/           # Express API endpoints (Auth, Chats, Schedule, Session, Settings)
│   ├── services/         # Core business logic (Store, AutoReply, Schedule, WhatsApp)
│   ├── socket/           # Real-time WebSocket server
│   └── utils/            # Logger, CORS, Chat Filters, Storage utilities
├── scripts/              # Helper scripts (clean.js, next-command.js)
├── Dockerfile            # Multi-stage Docker build config
├── ecosystem.config.js   # PM2 production process configuration
└── tailwind.config.js    # Custom design tokens & theme extension
```

---

## 📦 Production Deployment

### Option A: PM2 (Process Manager)
```bash
# 1. Build Next.js frontend
npm run build

# 2. Start both services with PM2
npx pm2 start ecosystem.config.js --env production

# 3. Save PM2 state for auto-restart on system reboot
npx pm2 startup
npx pm2 save
```

### Option B: Docker Container
```bash
# Build Docker images
docker build --target backend -t whatsapp-ai-backend .
docker build --target frontend -t whatsapp-ai-frontend .

# Run Backend container with persistent volume
docker run -d -p 3001:3001 \
  -v /var/lib/vr-2-runtime:/app/server/data \
  --name backend whatsapp-ai-backend
```

---

## 🔒 Security & Best Practices

- **CORS Protection**: Access to backend API routes is restricted strictly to origins configured in `CORS_ORIGINS`.
- **Authentication**: Dashboard endpoints require JWT HTTP-only cookies or authentication headers.
- **Data Persistence**: WhatsApp Web sessions, Human Mode pause states, and Scheduled Messages persist in `server/data/` across restarts.

---

## 📜 License

MIT License © 2026 Vigneshwar S
