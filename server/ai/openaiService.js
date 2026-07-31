const OpenAI = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");

function createOpenAIService() {
  let openAIClient;
  let openRouterClient;
  let groqClient;
  let geminiClient;

  function getProvider() {
    const configuredProvider = String(process.env.AI_PROVIDER || "").trim().toLowerCase();

    if (configuredProvider) {
      return configuredProvider;
    }

    return process.env.GEMINI_API_KEY ? "gemini" : "openai";
  }

  function getOpenAIClient() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is missing");
    }

    if (!openAIClient) {
      openAIClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }

    return openAIClient;
  }

  function getOpenRouterClient() {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is missing");
    }

    if (!openRouterClient) {
      openRouterClient = new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
          "X-Title": process.env.OPENROUTER_APP_NAME || "Personal Chat"
        }
      });
    }

    return openRouterClient;
  }

  function getGroqClient() {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is missing");
    }

    if (!groqClient) {
      groqClient = new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1"
      });
    }

    return groqClient;
  }

  function getGeminiClient() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing");
    }

    if (!geminiClient) {
      geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }

    return geminiClient;
  }

  function formatConversationHistory(conversationHistory = []) {
    const historyLines = conversationHistory
      .filter((message) => message?.body)
      .slice(-10)
      .map((message) => {
        const speaker = message.direction === "outgoing" ? "Me" : "Contact";
        return `${speaker}: ${String(message.body).slice(0, 500)}`;
      });

    if (!historyLines.length) {
      return "No prior context available.";
    }

    return historyLines.join("\n");
  }

  async function executeProviderCall(provider, { systemInstruction, prompt, temperature, maxTokens }) {
    let output = "";
    if (provider === "openrouter") {
      const client = getOpenRouterClient();
      const openRouterModel = process.env.OPENROUTER_MODEL;
      const modelPayload = openRouterModel
        ? { model: openRouterModel }
        : {
            models: [
              "meta-llama/llama-3.3-70b-instruct:free",
              "deepseek/deepseek-r1:free",
              "google/gemma-2-9b-it:free",
              "qwen/qwen-2.5-72b-instruct:free"
            ]
          };

      const completion = await client.chat.completions.create({
        ...modelPayload,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        temperature,
        max_tokens: maxTokens
      });

      output = completion.choices?.[0]?.message?.content?.trim() || "";
    } else if (provider === "openai" || provider === "groq") {
      const client = provider === "groq" ? getGroqClient() : getOpenAIClient();
      const completion = await client.chat.completions.create({
        model: provider === "groq" ? process.env.GROQ_MODEL || "llama-3.1-8b-instant" : process.env.OPENAI_MODEL || "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        temperature,
        max_tokens: maxTokens
      });

      output = completion.choices?.[0]?.message?.content?.trim() || "";
    } else if (provider === "gemini") {
      const genAI = getGeminiClient();
      const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
        systemInstruction
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      output = response.text().trim();
    } else {
      throw new Error(`Unsupported AI_PROVIDER "${provider}".`);
    }

    if (!output) {
      throw new Error(`${provider} returned an empty response`);
    }

    return output;
  }

  async function requestModelText({ systemInstruction, prompt, temperature = 0.7, maxTokens = 180 }) {
    const primaryProvider = getProvider();
    const allProviders = ["groq", "gemini", "openrouter", "openai"];
    // Put primary provider first, followed by others as fallbacks
    const providerChain = [primaryProvider, ...allProviders.filter((p) => p !== primaryProvider)];

    let lastError = null;
    for (const provider of providerChain) {
      // Skip providers whose API key isn't configured
      if (provider === "groq" && !process.env.GROQ_API_KEY) continue;
      if (provider === "gemini" && !process.env.GEMINI_API_KEY) continue;
      if (provider === "openrouter" && !process.env.OPENROUTER_API_KEY) continue;
      if (provider === "openai" && !process.env.OPENAI_API_KEY) continue;

      try {
        return await executeProviderCall(provider, { systemInstruction, prompt, temperature, maxTokens });
      } catch (err) {
        lastError = err;
        console.warn(`[AI Provider Fallback] ${provider} failed (${err.message}). Trying next fallback...`);
      }
    }

    throw lastError || new Error("All AI providers failed or no valid API keys configured");
  }

  function parseJsonObject(value) {
    const rawValue = String(value || "").trim();
    const jsonMatch = rawValue.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return null;
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      return null;
    }
  }

  async function classifyIntent({ messageText, contactName, conversationHistory = [], intents = [] }) {
    const safeMessageText = String(messageText || "").trim();
    const safeIntents = intents.filter(Boolean);

    if (!safeMessageText || !safeIntents.length) {
      return {
        intent: null,
        confidence: 0
      };
    }

    const systemInstruction = `You are an intent classifier for a WhatsApp bot.
Your job is to check if the user's message matches one of the predefined 'Allowed intents'.
- If it clearly matches an allowed intent (e.g., greetings, specific inquiries listed), return that intent.
- If the user is asking a general knowledge question (e.g., "what is climate", "how are you"), or asking about something NOT in the allowed intents (e.g., "atm franchise"), you MUST return null.
Return ONLY a valid JSON object with keys "intent" (string or null) and "confidence" (number between 0.0 and 1.0).`;

    const prompt = [
      `Allowed intents: ${safeIntents.join(", ")}`,
      `Contact: ${contactName || "unknown"}`,
      `Recent conversation:\n${formatConversationHistory(conversationHistory)}`,
      `Latest incoming message:\n${safeMessageText}`,
      'Output strictly JSON: {"intent": "intent_name_or_null", "confidence": 0.0}'
    ].join("\n\n");

    const output = await requestModelText({
      systemInstruction,
      prompt,
      temperature: 0,
      maxTokens: 80
    });
    const parsed = parseJsonObject(output);
    const intent = parsed?.intent === null ? null : String(parsed?.intent || "").trim();
    const confidence = Number(parsed?.confidence || 0);

    if (!intent || !safeIntents.includes(intent)) {
      return {
        intent: null,
        confidence: 0
      };
    }

    return {
      intent,
      confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0
    };
  }

  async function generateReply({ customPrompt, messageText, contactName, conversationHistory = [] }) {
    const safeMessageText = String(messageText || "").trim();

    if (!safeMessageText) {
      throw new Error("Cannot generate an AI reply for an empty message");
    }

    const systemInstruction = `${customPrompt}\nReply like a real person on WhatsApp. Keep it short unless the user asked for detail. Output only the message to send.`;
    const prompt = `Contact: ${contactName}\nRecent conversation:\n${formatConversationHistory(conversationHistory)}\n\nLatest incoming message:\n${safeMessageText}`;

    return requestModelText({
      systemInstruction,
      prompt,
      temperature: 0.7,
      maxTokens: 180
    });
  }

  return {
    classifyIntent,
    generateReply
  };
}

module.exports = {
  createOpenAIService
};
