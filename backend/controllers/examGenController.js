const Document = require("../models/Document");
const Exam = require("../models/Exam");
const Activity = require("../models/Activity");
const config = require("../config/env");
const { isRetryableGeminiError } = require("../utils/geminiRetry");

const MAX_EXAM_CONTEXT_CHARS = 25000;
const GEMINI_TOTAL_TIMEOUT_MS = 20000;
const GEMINI_PER_MODEL_TIMEOUT_MS = 7000;

const LOCAL_EXAMS = {
  easy: {
    title: "Fundamentals: Quick Knowledge Check",
    questions: [
      {
        type: "multiple-choice",
        question: "What is the main purpose of this document?",
        options: [
          "To inform about a specific topic",
          "To entertain the reader",
          "To sell a product",
          "To provide step-by-step instructions",
        ],
        correctAnswer: 0,
        explanation:
          "Documents are typically created to inform or educate readers about a specific subject.",
      },
      {
        type: "true-false",
        question:
          "The document contains factual information that can be verified.",
        options: ["True", "False"],
        correctAnswer: 0,
        explanation:
          "Most educational documents present factual, verifiable information.",
      },
      {
        type: "short-answer",
        question: "Briefly state the key topic discussed in this document.",
        options: [],
        correctAnswer: "the main topic",
        explanation:
          "Every document revolves around a central subject or theme.",
      },
      {
        type: "multiple-choice",
        question:
          "Which of the following best describes the document's structure?",
        options: [
          "Chronological order",
          "Compare and contrast",
          "Problem and solution",
          "Cannot be determined",
        ],
        correctAnswer: 3,
        explanation:
          "Without reading the full document, the structure cannot be determined.",
      },
      {
        type: "true-false",
        question:
          "All information in the document is guaranteed to be 100% accurate.",
        options: ["True", "False"],
        correctAnswer: 1,
        explanation:
          "While documents aim for accuracy, absolute guarantees are rare.",
      },
    ],
  },
  medium: {
    title: "Essentials: Comprehensive Assessment",
    questions: [
      {
        type: "multiple-choice",
        question:
          "Based on the document's content, which concept is most essential to understand?",
        options: [
          "The primary argument or thesis",
          "Minor supporting details",
          "The document's publication date",
          "The author's biography",
        ],
        correctAnswer: 0,
        explanation:
          "The primary argument or thesis is the central concept around which all other content revolves.",
      },
      {
        type: "short-answer",
        question: "Identify one key term or concept defined in the document.",
        options: [],
        correctAnswer: "key term",
        explanation:
          "Most documents introduce and define important terminology relevant to the subject.",
      },
      {
        type: "true-false",
        question:
          "The conclusions drawn in the document are supported by the evidence presented.",
        options: ["True", "False"],
        correctAnswer: 0,
        explanation:
          "Well-structured documents support their conclusions with relevant evidence.",
      },
      {
        type: "multiple-choice",
        question:
          "What would be the most appropriate next step after studying this document?",
        options: [
          "Review supplementary materials",
          "Memorize every detail",
          "Ignore contradictory information",
          "Move to an unrelated topic",
        ],
        correctAnswer: 0,
        explanation:
          "Supplementary materials help reinforce and expand understanding.",
      },
      {
        type: "short-answer",
        question: "Summarize the document's main conclusion in one sentence.",
        options: [],
        correctAnswer: "main conclusion",
        explanation:
          "The conclusion synthesizes the key takeaways of the document.",
      },
      {
        type: "multiple-choice",
        question: "How does the document present evidence for its claims?",
        options: [
          "Through examples and case studies",
          "Through emotional appeals only",
          "It does not provide evidence",
          "Through fictional scenarios",
        ],
        correctAnswer: 0,
        explanation:
          "Credible documents use examples and evidence to support their claims.",
      },
      {
        type: "true-false",
        question:
          "Understanding the context of this document is important for proper comprehension.",
        options: ["True", "False"],
        correctAnswer: 0,
        explanation:
          "Context provides background that is crucial for full understanding.",
      },
      {
        type: "short-answer",
        question:
          "Name one real-world application of the concepts discussed in this document.",
        options: [],
        correctAnswer: "real-world application",
        explanation:
          "Concepts typically have practical applications in relevant fields.",
      },
    ],
  },
  hard: {
    title: "Mastery: Advanced Examination",
    questions: [
      {
        type: "multiple-choice",
        question:
          "Which implicit assumption underlies the document's main argument?",
        options: [
          "That the audience has prior domain knowledge",
          "That the topic is universally understood",
          "That all evidence is objective",
          "That counterarguments do not exist",
        ],
        correctAnswer: 0,
        explanation:
          "Documents often assume a baseline level of knowledge from their audience.",
      },
      {
        type: "short-answer",
        question:
          "Identify a potential limitation or gap in the document's coverage of the topic.",
        options: [],
        correctAnswer: "limitation",
        explanation:
          "Critically evaluating the scope of a document reveals its limitations.",
      },
      {
        type: "true-false",
        question:
          "The document addresses all possible counterarguments to its position.",
        options: ["True", "False"],
        correctAnswer: 1,
        explanation:
          "Documents typically cannot address every possible counterargument due to space and scope constraints.",
      },
      {
        type: "multiple-choice",
        question:
          "How might the information in this document be applied differently in an alternative context?",
        options: [
          "It would need adaptation to fit the new context",
          "It applies universally without changes",
          "It would be completely irrelevant",
          "Only the conclusion would apply",
        ],
        correctAnswer: 0,
        explanation:
          "Knowledge often needs to be adapted when applied to different contexts.",
      },
      {
        type: "short-answer",
        question:
          "Propose an alternative approach to the methodology described in the document.",
        options: [],
        correctAnswer: "alternative approach",
        explanation:
          "Critical thinking involves considering alternative methodologies.",
      },
      {
        type: "multiple-choice",
        question:
          "Which relationship between concepts in the document is most nuanced?",
        options: [
          "The interplay between cause and effect",
          "Simple chronological progression",
          "Unrelated parallel ideas",
          "Direct contradictory relationship",
        ],
        correctAnswer: 0,
        explanation:
          "Cause-and-effect relationships often contain the most nuance in a document.",
      },
      {
        type: "true-false",
        question:
          "The document's framework could be extended to analyze related phenomena not directly discussed.",
        options: ["True", "False"],
        correctAnswer: 0,
        explanation:
          "Strong conceptual frameworks can often be generalized to related areas.",
      },
      {
        type: "short-answer",
        question:
          "Critique one assumption made by the author and suggest how it might be challenged.",
        options: [],
        correctAnswer: "challenge an assumption",
        explanation:
          "Critical analysis involves identifying and challenging underlying assumptions.",
      },
      {
        type: "multiple-choice",
        question:
          "What additional evidence would strengthen the document's conclusions?",
        options: [
          "Empirical data from peer-reviewed research",
          "More anecdotal examples",
          "Removing contradictory evidence",
          "Shorter explanations",
        ],
        correctAnswer: 0,
        explanation:
          "Peer-reviewed empirical data provides the strongest support for conclusions.",
      },
      {
        type: "true-false",
        question:
          "The document's conclusions are definitively proven beyond any reasonable doubt.",
        options: ["True", "False"],
        correctAnswer: 1,
        explanation:
          "In most academic and educational contexts, conclusions are supported rather than definitively proven.",
      },
    ],
  },
};

function sanitizeQuestions(questions) {
  return questions.map((q) => {
    const { correctAnswer, explanation, ...rest } = q;
    return rest;
  });
}

function calculateScore(questions, answers) {
  if (!questions?.length || !answers?.length) return 0;
  let correct = 0;
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const ans = answers[i];
    if (ans == null) continue;
    if (q.type === "short-answer") {
      if (
        typeof ans === "string" &&
        typeof q.correctAnswer === "string" &&
        ans.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
      ) {
        correct++;
      }
    } else {
      if (ans === q.correctAnswer) correct++;
    }
  }
  return Math.round((correct / questions.length) * 100);
}

function generateTitle(docTitles, difficulty) {
  const first = docTitles.split(",")[0]?.trim() || "Document";
  const adj =
    difficulty === "easy"
      ? "Fundamentals"
      : difficulty === "hard"
        ? "Mastery"
        : "Essentials";
  return `${adj}: ${first}`;
}

exports.generate = async (req, res) => {
  try {
    const { documentIds, count, difficulty } = req.body;
    if (!documentIds || !documentIds.length) {
      return res
        .status(400)
        .json({ message: "At least one document is required." });
    }
    const numQ = Math.min(Math.max(count || 5, 1), 20);
    const diff = ["easy", "medium", "hard"].includes(difficulty)
      ? difficulty
      : "medium";

    const docs = await Document.find({
      _id: { $in: documentIds },
      user: req.user.id,
    });
    if (!docs.length)
      return res.status(404).json({ message: "Documents not found." });
    const context = docs
      .map((d) => d.content || "")
      .join("\n\n")
      .substring(0, MAX_EXAM_CONTEXT_CHARS);
    const docTitles = docs.map((d) => d.title).join(", ");

    let title, questions;

    if (!config.GEMINI_API_KEY) {
      const local = LOCAL_EXAMS[diff] || LOCAL_EXAMS.medium;
      questions = local.questions.slice(0, numQ);
      title = local.title;
    } else {
      const models = config.GEMINI_MODELS;
      const startedAt = Date.now();

      async function tryModel(idx) {
        if (idx >= models.length) return null;
        const elapsed = Date.now() - startedAt;
        if (elapsed >= GEMINI_TOTAL_TIMEOUT_MS) return null;

        const model = models[idx];
        const timeoutMs = Math.min(
          GEMINI_PER_MODEL_TIMEOUT_MS,
          GEMINI_TOTAL_TIMEOUT_MS - elapsed,
        );
        let response;
        try {
          response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: AbortSignal.timeout(timeoutMs),
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: `Create a ${diff} difficulty exam with ${numQ} questions from this document. Include a MIX of question types:
- "multiple-choice" (4 options)
- "true-false" (2 options: ["True", "False"])
- "short-answer" (no options, user types the answer)

Return ONLY a JSON object (no markdown, no code blocks) with this structure:
{
  "title": "a short evocative name for this exam (max 6 words)",
  "questions": [
    {
      "type": "multiple-choice",
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctAnswer": 0,
      "explanation": "..."
    }
  ]
}

For true-false: type is "true-false", options are ["True", "False"], correctAnswer is 0 or 1.
For short-answer: type is "short-answer", options is an empty array, correctAnswer is a string (the expected answer), explanation provides context.

Mix the question types evenly.\n\nDocument:\n${context}`,
                      },
                    ],
                  },
                ],
              }),
            },
          );
        } catch (err) {
          console.error(`Gemini request failed (${model}):`, err.message);
          return tryModel(idx + 1);
        }
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
        const local = LOCAL_EXAMS[diff] || LOCAL_EXAMS.medium;
        questions = local.questions.slice(0, numQ);
        title = local.title;
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
        title = parsed.title || generateTitle(docTitles, diff);

        if (!Array.isArray(questions))
          return res
            .status(500)
            .json({ message: "Invalid AI response format." });
      }
    }

    const exam = await Exam.create({
      user: req.user.id,
      documents: documentIds,
      title,
      questions,
      difficulty: diff,
      status: "pending",
    });

    await Activity.create({
      user: req.user.id,
      type: "exam",
      description: `Generated ${diff} exam (${questions.length} questions) from ${docs.length} documents`,
      metadata: {
        difficulty: diff,
        count: questions.length,
        documents: docs.length,
      },
    });

    res.json({
      _id: exam._id,
      questions: sanitizeQuestions(questions),
      title,
      difficulty: diff,
      documentIds,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.list = async (req, res) => {
  try {
    const filter = { user: req.user.id, status: "completed" };
    const exams = await Exam.find(filter).sort("-createdAt").lean();
    const normalized = exams.map((e) => ({
      ...e,
      result: e.result?.score != null ? e.result : null,
    }));
    res.json(normalized);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { documentIds, title, questions, difficulty } = req.body;
    if (!documentIds?.length || !title || !questions?.length) {
      return res
        .status(400)
        .json({ message: "documentIds, title, and questions are required." });
    }
    const exam = await Exam.create({
      user: req.user.id,
      documents: documentIds,
      title,
      questions,
      difficulty: difficulty || "medium",
    });
    res.status(201).json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.saveResult = async (req, res) => {
  try {
    const { answers } = req.body;
    const exam = await Exam.findOne({ _id: req.params.id, user: req.user.id });
    if (!exam) return res.status(404).json({ message: "Exam not found." });
    const score = calculateScore(exam.questions, answers);
    exam.result = { score, answers };
    exam.status = "completed";

    await exam.save();
    res.json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.clearResult = async (req, res) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, user: req.user.id });
    if (!exam) return res.status(404).json({ message: "Exam not found." });
    exam.result = undefined;
    exam.status = "completed";
    await exam.save();
    res.json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const exam = await Exam.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!exam) return res.status(404).json({ message: "Exam not found." });
    res.json({ message: "Exam deleted." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
