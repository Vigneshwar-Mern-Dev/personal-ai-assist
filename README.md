# 💬 Personal WhatsApp AI Assistant & Control Room

[![Live Demo](https://img.shields.io/badge/Live_Site-personal--ai--assist.duckdns.org-00C853?style=for-the-badge&logo=vercel)](https://personal-ai-assist.duckdns.org)
[![Security](https://img.shields.io/badge/SSL-HTTPS_Secure-00B0FF?style=for-the-badge&logo=letsencrypt)](https://personal-ai-assist.duckdns.org)
[![Node.js](https://img.shields.io/badge/Node.js-v20_LTS-339933?style=for-the-badge&logo=nodedotjs)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-14_App_Router-000000?style=for-the-badge&logo=nextdotjs)](https://nextjs.org)

A modern, full-stack personal communication automation platform integrating **WhatsApp Web automation**, **Multi-AI provider failover** (`Groq`, `Gemini`, `OpenRouter`, `OpenAI`), **Smart Message Scheduling**, and a **Real-time Glassmorphic Control Dashboard**.

🌐 **Live Application**: [https://personal-ai-assist.duckdns.org](https://personal-ai-assist.duckdns.org)  
🔑 **Dashboard Login**: [https://personal-ai-assist.duckdns.org/login](https://personal-ai-assist.duckdns.org/login)

---

## ✨ Features

- 🤖 **AI Auto-Replies**: Automatic, context-aware casual replies for one-to-one personal chats.
- ⚡ **Multi-AI Provider Failover**: Automatic fallback chain (`Groq` ➔ `Gemini` ➔ `OpenRouter` ➔ `OpenAI`). If the primary provider hits a rate-limit or outage, secondary providers take over seamlessly.
- 📅 **Message Scheduling & Reminders**: Schedule one-time or recurring WhatsApp messages to any contact with date/time pickers, quick AI templates, live countdowns, and automated background execution.
- 🛑 **Human Mode (Pause AI)**: Pause AI per-chat for manual intervention. Chat pause states persist in storage across server restarts.
- 💬 **Direct Dashboard Messaging**: Send manual WhatsApp messages to any contact directly from the dashboard UI.
- 🛡️ **Anti-Ban & Human Simulation**:
  - **Dynamic Typing Simulation**: Character-length calculated typing speeds (4s base + 90ms/char) with continuous 3s refresh loops so `typing...` stays active on the recipient's screen until the message lands.
  - **Human Delays**: 5s–15s randomized delays to prevent bot pattern detection.
  - **Smart Filtering**: Automatically filters out groups (`@g.us`), broadcasts, and bank/OTP/telecom notification messages (*SBI, HDFC, ICICI, etc.*).
- 🎨 **Glassmorphic UI**: Built with Next.js 14, Tailwind CSS, custom design tokens, animated live status indicators, and Socket.io real-time updates.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, Socket.io Client, Lucide React
- **Backend**: Node.js, Express, Socket.io, `whatsapp-web.js` (Puppeteer / Chromium)
- **AI Integrations**: `@google/generative-ai` (Gemini), `openai` (Groq, OpenRouter, OpenAI)
- **Process & Deployment**: PM2, Docker (Multi-stage build), CloudPanel / Nginx Reverse Proxy

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

### Option A: PM2 & Nginx (CloudPanel / VPS)
```bash
# 1. Build Next.js frontend
npm run build

# 2. Start both services with PM2
npx pm2 start ecosystem.config.js --env production

# 3. Save PM2 state for auto-restart on system reboot
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

- **CORS & Reverse Proxy**: Same-origin Next.js rewrites and Nginx proxying for HTTPS and WebSocket (`/socket.io/`) without exposing backend ports.
- **Authentication**: Dashboard endpoints require JWT HTTP-only cookies with auto-detected secure flags.
- **Data Persistence**: WhatsApp Web sessions, Human Mode pause states, and Scheduled Messages persist across server restarts.

---

## 📜 License

MIT License © 2026 Vigneshwar S
