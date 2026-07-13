const StudyRoadmap = require("../models/StudyRoadmap");
const Document = require("../models/Document");
const Flashcard = require("../models/Flashcard");
const DocumentQuiz = require("../models/DocumentQuiz");
const Activity = require("../models/Activity");
const config = require("../config/env");
const { generateLocalRoadmap } = require("../utils/freeAiFallback");
const { isRetryableGeminiError } = require("../utils/geminiRetry");

const MODELS = config.GEMINI_MODELS;

async function callGemini(prompt) {
  async function tryModel(modelIndex) {
    if (modelIndex >= MODELS.length) return null;

    const model = MODELS[modelIndex];
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        }),
      },
    );

    if (!response.ok) {
      const data = await response.json();
      if (isRetryableGeminiError(response, data)) {
        return tryModel(modelIndex + 1);
      }
      console.error("Gemini API error:", JSON.stringify(data));
      return null;
    }

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) {
      console.error("Unexpected Gemini response:", JSON.stringify(data));
      return null;
    }
    return reply;
  }

  return tryModel(0);
}

function buildPrompt(userData) {
  const {
    name,
    documentCount,
    flashcardCount,
    quizCount,
    weakAreas,
    strengths,
  } = userData;

  let prompt = `You are an expert AI learning advisor. Generate a personalized study roadmap for a student named "${name}".

Here is the student's learning profile:
- Documents uploaded: ${documentCount}
- Flashcards created: ${flashcardCount}
- Quizzes taken: ${quizCount}
`;

  if (strengths.length > 0) {
    prompt += `\nStrengths: ${strengths.join(", ")}`;
  }
  if (weakAreas.length > 0) {
    prompt += `\nAreas needing improvement: ${weakAreas.join(", ")}`;
  }

  prompt += `\n\nGenerate a JSON study roadmap with this exact structure (no markdown, no code fences, pure JSON):
{
  "title": "A personalized roadmap title",
  "summary": "2-3 sentence assessment of their learning journey and overall recommendation",
  "strengths": ["strength1", "strength2"],
  "weakAreas": ["area1", "area2"],
  "recommendedNextSteps": ["immediate actionable step 1", "step 2", "step 3"],
  "milestones": [
    {
      "title": "Milestone name",
      "description": "What to do and why it matters",
      "estimatedTime": "e.g. 2-3 days or 1 week",
      "priority": "high|medium|low",
      "type": "document|quiz|flashcard|review|practice"
    }
  ]
}

Important guidelines:
- Generate 4-7 milestones that form a logical learning progression
- Base recommendations on their actual data
- If they have no activity, suggest getting started with fundamentals
- Make it encouraging and actionable
- Prioritize filling knowledge gaps over repeating known material`;

  return prompt;
}

async function collectUserData(userId) {
  const [documents, flashcards, documentQuizzes, activities] =
    await Promise.all([
      Document.find({ user: userId }),
      Flashcard.find({ user: userId }),
      DocumentQuiz.find({ user: userId }),
      Activity.find({ user: userId }).sort("-createdAt").limit(20),
    ]);

  const recentActivity = activities.slice(0, 5).map((a) => ({
    type: a.type,
    description: a.description,
  }));

  return {
    documentCount: documents.length,
    flashcardCount: flashcards.length,
    quizCount: documentQuizzes.length,
    strengths: ["Getting started"],
    weakAreas: ["Building foundational knowledge"],
    recentActivity,
  };
}

exports.generateRoadmap = async (req, res) => {
  try {
    const userData = await collectUserData(req.user.id);
    userData.name = req.user.name;

    const prompt = buildPrompt(userData);
    let roadmapData;

    if (config.GEMINI_API_KEY) {
      const aiResponse = await callGemini(prompt);
      if (aiResponse) {
        try {
          const cleaned = aiResponse
            .replace(/```json\s*/gi, "")
            .replace(/```\s*/g, "")
            .trim();
          roadmapData = JSON.parse(cleaned);
        } catch (parseErr) {
          console.error(
            "Failed to parse AI response as JSON:",
            parseErr.message,
          );
          roadmapData = null;
        }
      }
    }

    if (!roadmapData) {
      roadmapData = generateLocalRoadmap(userData);
    }

    let roadmap = await StudyRoadmap.findOne({ user: req.user.id });

    if (!roadmap) {
      roadmap = new StudyRoadmap({ user: req.user.id });
    }

    roadmap.title = roadmapData.title;
    roadmap.summary = roadmapData.summary;
    roadmap.strengths = roadmapData.strengths || [];
    roadmap.weakAreas = roadmapData.weakAreas || [];
    roadmap.recommendedNextSteps = roadmapData.recommendedNextSteps || [];
    roadmap.milestones = roadmapData.milestones || [];
    roadmap.generatedAt = new Date();

    await roadmap.save();

    // Log activity
    await Activity.create({
      user: req.user.id,
      type: "roadmap",
      description: "Generated a personalized study roadmap",
      metadata: { target: "study-roadmap" },
    });

    res.json(roadmap);
  } catch (err) {
    console.error("Roadmap generation error:", err.message);
    res.status(500).json({ message: "Failed to generate study roadmap." });
  }
};

exports.getRoadmap = async (req, res) => {
  try {
    const roadmap = await StudyRoadmap.findOne({ user: req.user.id });
    if (!roadmap) {
      return res.json(null);
    }
    res.json(roadmap);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
