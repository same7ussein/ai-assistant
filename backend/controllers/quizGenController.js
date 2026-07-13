const Document = require("../models/Document");
const DocumentQuiz = require("../models/DocumentQuiz");
const Activity = require("../models/Activity");
const config = require("../config/env");
const { generateLocalQuiz } = require("../utils/freeAiFallback");
const { isRetryableGeminiError } = require("../utils/geminiRetry");

function generateTitle(docTitle, difficulty) {
  const adj =
    difficulty === "easy"
      ? "Fundamentals"
      : difficulty === "hard"
        ? "Mastery"
        : "Essentials";
  return `${adj}: ${docTitle}`;
}

function sanitizeQuestions(questions) {
  return questions.map((q) => {
    const { correctAnswer, explanation, ...rest } = q;
    return rest;
  });
}

exports.generate = async (req, res) => {
  try {
    const { documentId, count, difficulty } = req.body;
    const numQ = Math.min(Math.max(count || 5, 1), 20);
    const diff = ["easy", "medium", "hard"].includes(difficulty)
      ? difficulty
      : "medium";

    const doc = await Document.findOne({ _id: documentId, user: req.user.id });
    if (!doc) return res.status(404).json({ message: "Document not found." });
    const context = doc.content.substring(0, 25000);

    let title, questions;

    if (!config.GEMINI_API_KEY) {
      const result = generateLocalQuiz(context, numQ, diff);
      questions = result.questions;
      title = result.title;
    } else {
      const models = config.GEMINI_MODELS;

      async function tryModel(idx) {
        if (idx >= models.length) return null;
        const model = models[idx];
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
                      text: `Create a ${diff} difficulty quiz with ${numQ} multiple-choice questions from this document.
Return ONLY a JSON object (no markdown, no code blocks) with this structure:
{
  "title": "a short evocative name for this quiz (max 6 words)",
  "questions": [
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctAnswer": 0,
      "explanation": "..."
    }
  ]
}\n\nDocument:\n${context}`,
                    },
                  ],
                },
              ],
            }),
          },
        );
        const data = await response.json();
        if (!response.ok && isRetryableGeminiError(response, data))
          return tryModel(idx + 1);
        if (!response.ok) {
          console.error(`Gemini error (${model}):`, JSON.stringify(data));
          return null;
        }
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
      }

      const raw = await tryModel(0);
      if (!raw) {
        const result = generateLocalQuiz(context, numQ, diff);
        questions = result.questions;
        title = result.title;
      } else {
        const json = raw
          .replace(/```json\s*/gi, "")
          .replace(/```\s*/g, "")
          .trim();
        let parsed;
        try {
          parsed = JSON.parse(json);
        } catch {
          return res
            .status(500)
            .json({ message: "Failed to parse AI response." });
        }

        questions = (parsed.questions || parsed).slice(0, numQ);
        title = parsed.title || generateTitle(doc.title, diff);

        if (!Array.isArray(questions))
          return res
            .status(500)
            .json({ message: "Invalid AI response format." });
      }
    }

    const quiz = await DocumentQuiz.create({
      user: req.user.id,
      document: documentId,
      title,
      questions,
      difficulty: diff,
    });

    await Activity.create({
      user: req.user.id,
      type: "quiz",
      description: `Generated ${diff} quiz (${questions.length} questions) from "${doc.title}"`,
      document: doc._id,
      metadata: { difficulty: diff, count: questions.length },
    });

    res.json({
      _id: quiz._id,
      questions: sanitizeQuestions(questions),
      title,
      difficulty: diff,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
