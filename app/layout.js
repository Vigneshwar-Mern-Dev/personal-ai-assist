import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { DashboardProvider } from "@/components/dashboard-provider";

export const metadata = {
  title: "Personal Chat · Control Room",
  description: "AI-powered personal WhatsApp assistant dashboard"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <DashboardProvider>
          <AppShell>{children}</AppShell>
        </DashboardProvider>
      </body>
    </html>
  );
}
