const WeeklyStudyPlan = require("../models/WeeklyStudyPlan");
const Document = require("../models/Document");
const Flashcard = require("../models/Flashcard");
const DocumentQuiz = require("../models/DocumentQuiz");
const Exam = require("../models/Exam");
const StudySession = require("../models/StudySession");
const Activity = require("../models/Activity");
const config = require("../config/env");
const { generateLocalWeeklyPlan } = require("../utils/freeAiFallback");
const { isRetryableGeminiError } = require("../utils/geminiRetry");

const MODELS = config.GEMINI_MODELS;

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getSunday(monday) {
  const sun = new Date(monday);
  sun.setDate(monday.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return sun;
}

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
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
        }),
      },
    );
    if (!response.ok) {
      const data = await response.json();
      if (isRetryableGeminiError(response, data))
        return tryModel(modelIndex + 1);
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
  const { name, docTitles, dueCount, avgQuizScore, currentStreak, weakAreas } =
    userData;
  let prompt = `You are an expert AI study coach. Generate a personalized 7-day study plan for a student named "${name}".

Here is the student's current learning profile:
- Documents: ${userData.documentCount} (${docTitles.slice(0, 3).join(", ")}${docTitles.length > 3 ? "..." : ""})
- Flashcards created: ${userData.flashcardCount}
- Cards due for review: ${dueCount}
- Quizzes taken: ${userData.quizCount}
- Exams taken: ${userData.examCount}
- Average quiz score: ${avgQuizScore != null ? avgQuizScore + "%" : "N/A"}
- Current streak: ${currentStreak} days
- Study sessions last 7 days: ${userData.sessionCount}
`;

  if (weakAreas.length > 0) {
    prompt += `\nAreas needing improvement: ${weakAreas.join(", ")}`;
  }
  if (userData.strengths.length > 0) {
    prompt += `\nStrengths: ${userData.strengths.join(", ")}`;
  }

  prompt += `\n\nGenerate a weekly study plan as JSON with this exact structure (no markdown, no code fences, pure JSON):
{
  "focusScore": <number 0-100>,
  "weeklyGoal": "<one sentence weekly goal>",
  "strengths": ["strength1", "strength2"],
  "weakAreas": ["area1", "area2"],
  "dailyPlans": [
    {
      "dayOfWeek": <0 for Monday, 6 for Sunday>,
      "totalMinutes": <total estimated minutes>,
      "tasks": [
        {
          "title": "<concise task title>",
          "description": "<why this matters>",
          "type": "flashcard|quiz|exam|review|document|practice",
          "duration": <minutes>,
          "priority": "high|medium|low",
          "source": "<what this is based on>"
        }
      ]
    }
  ]
}

Guidelines:
- Generate 2-5 tasks per day depending on difficulty
- Weekdays (0-4) can have more tasks, weekends (5-6) lighter
- High priority tasks should focus on weakest areas
- Total weekly study time should be realistic (5-15 hours)
- Include a mix of review, new learning, and assessment
- Reference specific topics from their documents and weak areas
- Make it encouraging and actionable
- Suggest catch-up tasks if they missed days`;

  return prompt;
}

async function collectUserData(userId) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

  const [documents, flashcards, quizzes, exams, sessions, activities] =
    await Promise.all([
      Document.find({ user: userId }).select("title").lean(),
      Flashcard.find({ user: userId }).lean(),
      DocumentQuiz.find({ user: userId }).lean(),
      Exam.find({ user: userId }).lean(),
      StudySession.find({ user: userId, startedAt: { $gte: sevenDaysAgo } })
        .select("startedAt endedAt cardsReviewed avgQuality cards duration")
        .lean(),
      Activity.find({ user: userId, createdAt: { $gte: sevenDaysAgo } })
        .sort("-createdAt")
        .lean(),
    ]);

  const now = new Date();
  const dueCount = await Flashcard.countDocuments({
    user: userId,
    $or: [
      { nextReviewAt: { $lte: now } },
      { lastQuality: { $lte: 3, $ne: null } },
    ],
  });

  const reviewedFlashcards = flashcards.filter((f) => f.lastQuality != null);
  const avgQuality =
    reviewedFlashcards.length > 0
      ? reviewedFlashcards.reduce((s, f) => s + (f.lastQuality || 0), 0) /
        reviewedFlashcards.length
      : null;

  const retentionData = {
    mastered: 0,
    learning: 0,
    struggling: 0,
    unreviewed: 0,
  };
  for (const f of flashcards) {
    if (!f.totalReviews) retentionData.unreviewed++;
    else if (f.interval >= 21) retentionData.mastered++;
    else if (f.interval >= 7) retentionData.learning++;
    else retentionData.struggling++;
  }

  const weakAreas = [];
  const topicsByScore = {};
  for (const q of quizzes) {
    const score = q.result?.score;
    if (score != null && score < 70 && q.title) {
      weakAreas.push(q.title);
    }
    if (q.title) {
      topicsByScore[q.title] = (topicsByScore[q.title] || 0) + 1;
    }
  }
  for (const e of exams) {
    if (e.result?.score != null && e.result.score < 70 && e.title) {
      weakAreas.push(e.title);
    }
  }

  if (
    retentionData.struggling > retentionData.mastered &&
    retentionData.struggling > 5
  ) {
    weakAreas.push("Flashcard retention (struggling cards)");
  }
  if (dueCount > 20) {
    weakAreas.push("Review backlog");
  }

  const scoredQuizzes = quizzes
    .map((q) => q.result?.score)
    .filter((s) => s != null);
  const avgQuizScore =
    scoredQuizzes.length > 0
      ? Math.round(
          scoredQuizzes.reduce((s, v) => s + v, 0) / scoredQuizzes.length,
        )
      : null;

  const scoredExams = exams
    .map((e) => e.result?.score)
    .filter((s) => s != null);
  const avgExamScore =
    scoredExams.length > 0
      ? Math.round(scoredExams.reduce((s, v) => s + v, 0) / scoredExams.length)
      : null;

  const reviewDays = new Set();
  for (const f of flashcards) {
    if (f.reviewedAt) {
      const d = new Date(f.reviewedAt).toISOString().slice(0, 10);
      reviewDays.add(d);
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000)
    .toISOString()
    .slice(0, 10);
  let currentStreak = 0;
  const startDate = reviewDays.has(todayStr)
    ? todayStr
    : reviewDays.has(yesterdayStr)
      ? yesterdayStr
      : null;
  if (startDate) {
    const start = new Date(startDate);
    for (let i = 0; i < 365; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() - i);
      if (reviewDays.has(d.toISOString().slice(0, 10))) currentStreak++;
      else break;
    }
  }

  const studySessions = sessions.map((s) => ({
    date: s.startedAt,
    duration: s.endedAt
      ? Math.round((new Date(s.endedAt) - new Date(s.startedAt)) / 60000)
      : null,
    cardsReviewed: s.cardsReviewed,
    avgQuality: s.avgQuality,
  }));

  return {
    documentCount: documents.length,
    docTitles: documents.map((d) => d.title).filter(Boolean),
    flashcardCount: flashcards.length,
    dueCount,
    quizCount: quizzes.length,
    examCount: exams.length,
    avgQuizScore,
    avgExamScore,
    avgQuality,
    currentStreak,
    retentionData,
    weakAreas: [...new Set(weakAreas)].slice(0, 5),
    strengths:
      currentStreak > 2
        ? [`${currentStreak}-day review streak`, "Consistent practice"]
        : flashcards.length > 0
          ? ["Active flashcard learner"]
          : ["Ready to begin"],
    studySessions,
    sessionCount: sessions.length,
    recentActivity: activities.slice(0, 10).map((a) => ({
      type: a.type,
      description: a.description,
    })),
  };
}

exports.currentPlan = async (req, res) => {
  try {
    const monday = getMonday(new Date());
    const sunday = getSunday(monday);
    const plan = await WeeklyStudyPlan.findOne({
      user: req.user.id,
      weekStart: { $gte: monday },
    }).sort("-generatedAt");
    res.json(plan || null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.generatePlan = async (req, res) => {
  try {
    const userData = await collectUserData(req.user.id);
    userData.name = req.user.name;

    let planData;

    if (config.GEMINI_API_KEY) {
      const prompt = buildPrompt(userData);
      const aiResponse = await callGemini(prompt);
      if (aiResponse) {
        try {
          const cleaned = aiResponse
            .replace(/```json\s*/gi, "")
            .replace(/```\s*/g, "")
            .trim();
          planData = JSON.parse(cleaned);
        } catch (parseErr) {
          console.error(
            "Failed to parse AI response as JSON:",
            parseErr.message,
          );
        }
      }
    }

    if (!planData) {
      planData = generateLocalWeeklyPlan(userData);
    }

    const monday = getMonday(new Date());
    const sunday = getSunday(monday);

    // Ensure all daily plans have a date field
    if (planData.dailyPlans) {
      planData.dailyPlans = planData.dailyPlans.map((dailyPlan, index) => {
        const dayDate = new Date(monday);
        dayDate.setDate(monday.getDate() + index);
        dayDate.setHours(0, 0, 0, 0);
        return {
          ...dailyPlan,
          date: dailyPlan.date ? new Date(dailyPlan.date) : dayDate,
        };
      });
    }

    const existing = await WeeklyStudyPlan.findOne({
      user: req.user.id,
      weekStart: { $gte: monday },
    });

    if (existing) {
      await WeeklyStudyPlan.deleteOne({ _id: existing._id });
    }

    const plan = await WeeklyStudyPlan.create({
      user: req.user.id,
      weekStart: monday,
      weekEnd: sunday,
      focusScore: planData.focusScore,
      dailyPlans: planData.dailyPlans || [],
      weeklyGoal: planData.weeklyGoal || "",
      strengths: planData.strengths || [],
      weakAreas: planData.weakAreas || [],
      generatedAt: new Date(),
    });

    await Activity.create({
      user: req.user.id,
      type: "roadmap",
      description: "Generated a weekly study plan",
      metadata: { target: "weekly-plan" },
    });

    res.status(201).json(plan);
  } catch (err) {
    console.error("Weekly plan generation error:", err.message);
    res.status(500).json({ message: "Failed to generate weekly study plan." });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { completed, skipped } = req.body;

    const monday = getMonday(new Date());
    const plan = await WeeklyStudyPlan.findOne({
      user: req.user.id,
      weekStart: { $gte: monday },
    }).sort("-generatedAt");

    if (!plan) {
      return res.status(404).json({ message: "No active weekly plan found." });
    }

    let found = false;
    for (const day of plan.dailyPlans) {
      for (const task of day.tasks) {
        if (task._id.toString() === taskId) {
          if (completed === true) {
            task.completed = true;
            task.completedAt = new Date();
            task.skipped = false;
          } else if (skipped === true) {
            task.skipped = true;
            task.completed = false;
            task.completedAt = null;
          } else if (completed === false) {
            task.completed = false;
            task.completedAt = null;
            task.skipped = false;
          }
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      return res.status(404).json({ message: "Task not found." });
    }

    await plan.save();
    res.json(plan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.history = async (req, res) => {
  try {
    const plans = await WeeklyStudyPlan.find({ user: req.user.id })
      .sort("-weekStart")
      .limit(12)
      .select("-dailyPlans")
      .lean();
    res.json(plans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
