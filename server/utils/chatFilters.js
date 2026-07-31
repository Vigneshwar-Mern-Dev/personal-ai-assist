function getSerializedChatId(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return value.id?._serialized || value._serialized || "";
}

function isPersonalChatId(value) {
  const chatId = getSerializedChatId(value);

  if (!chatId) {
    return false;
  }

  if (
    chatId === "status@broadcast" ||
    chatId.endsWith("@g.us") ||
    chatId.endsWith("@newsletter") ||
    chatId.endsWith("@broadcast")
  ) {
    return false;
  }

  return true;
}

function isPersonalChat(chat) {
  if (!chat) return true;
  return !chat.isGroup && isPersonalChatId(chat);
}

const defaultBlockedContactPatterns = [
  /\bsbi\b/i,
  /\bhdfc\b/i,
  /\bicici\b/i,
  /\baxis\b/i,
  /\bkotak\b/i,
  /\byes\s*bank\b/i,
  /\bbank\b/i,
  /\bupi\b/i,
  /\botp\b/i,
  /\bpaytm\b/i,
  /\bphonepe\b/i,
  /\bgpay\b/i,
  /\bgoogle\s*pay\b/i,
  /\bamazon\s*pay\b/i,
  /\bairtel\b/i,
  /\bjio\b/i,
  /\bvodafone\b/i,
  /\bvi\b/i,
  /\bmeta\b/i,
  /\bfacebook\b/i,
  /\binstagram\b/i,
  /\bwhatsapp\b/i,
  /\btelegram\b/i,
  /\bsupport\b/i,
  /\bservice\b/i,
  /\balert\b/i,
  /\bnotify\b/i,
  /\bnotification\b/i,
  /\bno[-\s]?reply\b/i
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Cache configured patterns so we don't re-parse the env var on every message.
let configuredBlockedPatterns = null;

function getConfiguredBlockedContactPatterns() {
  if (configuredBlockedPatterns !== null) {
    return configuredBlockedPatterns;
  }

  configuredBlockedPatterns = String(process.env.AUTO_REPLY_BLOCKED_CONTACTS || "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => new RegExp(`\\b${escapeRegExp(name)}\\b`, "i"));

  return configuredBlockedPatterns;
}

function hasBlockedContactName(contactName) {
  const safeName = String(contactName || "").trim();

  if (!safeName) {
    return false;
  }

  return [...defaultBlockedContactPatterns, ...getConfiguredBlockedContactPatterns()].some(
    (pattern) => pattern.test(safeName)
  );
}

function shouldAutoReplyToContact({ chat, contact, contactName }) {
  if (chat && !isPersonalChat(chat)) {
    return false;
  }

  return !hasBlockedContactName(contactName);
}

module.exports = {
  isPersonalChat,
  isPersonalChatId,
  shouldAutoReplyToContact
};
