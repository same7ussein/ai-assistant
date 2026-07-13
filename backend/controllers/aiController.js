const config = require("../config/env");
const { chatFallback } = require("../utils/freeAiFallback");
const { isRetryableGeminiError } = require("../utils/geminiRetry");

const MODELS = config.GEMINI_MODELS;

exports.chat = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message)
      return res.status(400).json({ message: "Message is required." });

    if (!config.GEMINI_API_KEY) {
      return res.json(chatFallback(message));
    }

    async function tryModel(modelIndex) {
      if (modelIndex >= MODELS.length) return null;

      const model = MODELS[modelIndex];
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are a helpful AI learning assistant. Help students understand concepts, provide examples, and guide their learning journey.\n\nStudent: ${message}`,
                  },
                ],
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        if (isRetryableGeminiError(response, data)) {
          return tryModel(modelIndex + 1);
        }
        console.error(`Gemini API error (${model}):`, JSON.stringify(data));
        return chatFallback(message);
      }

      const data = await response.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!reply) {
        console.error("Unexpected Gemini response:", JSON.stringify(data));
        return chatFallback(message);
      }
      return { reply };
    }

    const result = await tryModel(0);
    if (!result) {
      return res.json(chatFallback(message));
    }
    res.json(result);
  } catch (err) {
    console.error("AI controller error:", err.message);
    res.json(chatFallback(req.body?.message || ""));
  }
};
