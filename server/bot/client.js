const { Client, LocalAuth } = require("whatsapp-web.js");
const { authPath, cachePath } = require("../config/runtimePaths");

function createWhatsAppClient() {
  return new Client({
    authStrategy: new LocalAuth({
      clientId: "primary-session",
      dataPath: authPath
    }),
    webVersionCache: {
      type: "local",
      path: cachePath
    },
    puppeteer: {
      headless: true,
      protocolTimeout: 300000,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-extensions",
        "--disable-gpu",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--no-first-run",
        '--js-flags="--max-old-space-size=256"',
        "--disable-component-update"
      ]
    }
  });
}

module.exports = {
  createWhatsAppClient
};
