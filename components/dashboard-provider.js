"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { io } from "socket.io-client";
import { SOCKET_URL, apiRequest } from "@/lib/api";

const DashboardContext = createContext(null);

const emptySnapshot = {
  status: {
    value: "disconnected",
    qrCode: null,
    connectedAt: null,
    lastError: null,
    clientName: null,
    phoneNumber: null
  },
  settings: {
    aiEnabled: false,
    typingSimulation: true,
    replyDelayMinSeconds: 5,
    replyDelayMaxSeconds: 15,
    customPrompt: ""
  },
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
  stats: {
    totalChats: 0,
    unreadChats: 0,
    aiRepliedCount: 0,
    pendingReplies: 0
  }
};

export function DashboardProvider({ children }) {
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState("");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;
    let socket = null;

    async function loadSnapshot() {
      if (pathname === "/login") {
        setLoading(false);
        return;
      }

      try {
        const response = await apiRequest("/api/app");
        if (mounted && response.snapshot) {
          setSnapshot(response.snapshot);
          setLoading(false);
          
          // Connect socket only after successful auth
          if (!socket) {
            socket = io({
              path: "/socket.io/",
              transports: ["polling", "websocket"],
              withCredentials: true
            });

            socket.on("app:snapshot", (nextSnapshot) => {
              if (mounted && nextSnapshot) {
                setError("");
                setSnapshot(nextSnapshot);
              }
            });

            socket.on("connect_error", () => {
              if (mounted) {
                setError(`Could not connect to realtime server at ${SOCKET_URL}`);
              }
            });
          }
        }
      } catch (requestError) {
        if (mounted) {
          if (requestError.message.toLowerCase().includes("unauthorized") || requestError.message.toLowerCase().includes("session")) {
             router.replace("/login");
          } else {
             setError(requestError.message);
          }
          setLoading(false);
        }
      }
    }

    loadSnapshot();

    return () => {
      mounted = false;
      if (socket) socket.close();
    };
  }, [pathname, router]);

  async function runAction(actionKey, requestPath, options) {
    setSubmitting(actionKey);
    setError("");

    try {
      const response = await apiRequest(requestPath, options);
      if (response.snapshot) {
        setSnapshot(response.snapshot);
      }
      return response;
    } catch (requestError) {
      const msg = requestError.message.toLowerCase();
      if (msg.includes("unauthorized") || msg === "invalid session" || msg === "no token") {
         router.replace("/login");
      }
      setError(requestError.message);
      throw requestError;
    } finally {
      setSubmitting("");
    }
  }

  async function logout() {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
      router.replace("/login");
    } catch (err) {
      router.replace("/login");
    }
  }

  const value = {
    snapshot,
    loading,
    error,
    submitting,
    actions: {
      refresh: () => runAction("refresh", "/api/app"),
      updateSettings: (payload) =>
        runAction("settings", "/api/settings", {
          method: "PUT",
          body: JSON.stringify(payload)
        }),
      reconnect: () => runAction("session", "/api/session/reconnect", { method: "POST" }),
      regenerateQr: () => runAction("session", "/api/session/regenerate-qr", { method: "POST" }),
      whatsappLogout: () => runAction("session", "/api/session/logout", { method: "POST" }),
      resetSession: () => runAction("session", "/api/session/reset", { method: "POST" }),
      logout: logout
    }
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const context = useContext(DashboardContext);

  if (!context) {
    throw new Error("useDashboard must be used inside DashboardProvider");
  }

  return context;
}
