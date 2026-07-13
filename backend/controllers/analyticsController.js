const Flashcard = require("../models/Flashcard");
const DocumentQuiz = require("../models/DocumentQuiz");
const Exam = require("../models/Exam");
const Activity = require("../models/Activity");
const Document = require("../models/Document");

// ── helpers ────────────────────────────────────────────────────────────────

function toDateStr(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function extractScore(result) {
  if (!result) return null;

  function toFiniteNumber(v) {
    if (v == null) return null;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const cleaned = v.trim().replace("%", "");
      const parsed = Number(cleaned);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  }

  const direct = [
    result.score,
    result.percentage,
    result.percent,
    result.value,
  ];
  for (const v of direct) {
    const n = toFiniteNumber(v);
    if (n != null) return n;
  }

  if (
    result.correct != null &&
    result.total != null &&
    Number(result.total) > 0
  ) {
    return Math.round((Number(result.correct) / Number(result.total)) * 100);
  }

  return null;
}

function computeStreaks(flashcards) {
  const reviewDays = new Set();
  for (const c of flashcards) {
    if (c.reviewedAt) reviewDays.add(toDateStr(c.reviewedAt));
  }

  const sorted = [...reviewDays].sort();
  let longestStreak = 0,
    run = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      run = 1;
      continue;
    }
    const diff = Math.round(
      (new Date(sorted[i]) - new Date(sorted[i - 1])) / 86400000,
    );
    if (diff === 1) run++;
    else {
      longestStreak = Math.max(longestStreak, run);
      run = 1;
    }
  }
  longestStreak = Math.max(longestStreak, run);

  const todayStr = toDateStr(new Date());
  const yesterdayStr = toDateStr(new Date(Date.now() - 86400000));
  let currentStreak = 0;
  const startStr = reviewDays.has(todayStr)
    ? todayStr
    : reviewDays.has(yesterdayStr)
      ? yesterdayStr
      : null;
  if (startStr) {
    const start = new Date(startStr);
    for (let i = 0; i < 365; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() - i);
      if (reviewDays.has(toDateStr(d))) currentStreak++;
      else break;
    }
  }

  return { currentStreak, longestStreak };
}

function computeDailyActivity(flashcards, quizzes, exams, days) {
  const result = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const ds = toDateStr(d);
    result.push({
      date: ds,
      reviews: flashcards.filter(
        (c) => c.reviewedAt && toDateStr(c.reviewedAt) === ds,
      ).length,
      quizzes: quizzes.filter(
        (q) => q.createdAt && toDateStr(q.createdAt) === ds,
      ).length,
      exams: exams.filter((e) => e.createdAt && toDateStr(e.createdAt) === ds)
        .length,
    });
  }
  return result;
}

function computeHeatmap(flashcards, quizzes, exams, days) {
  const countMap = {};
  for (const c of flashcards) {
    if (c.reviewedAt) {
      const d = toDateStr(c.reviewedAt);
      countMap[d] = (countMap[d] || 0) + 1;
    }
  }
  for (const q of quizzes) {
    if (q.createdAt) {
      const d = toDateStr(q.createdAt);
      countMap[d] = (countMap[d] || 0) + 1;
    }
  }
  for (const e of exams) {
    if (e.createdAt) {
      const d = toDateStr(e.createdAt);
      countMap[d] = (countMap[d] || 0) + 1;
    }
  }
  const result = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const ds = toDateStr(d);
    result.push({ date: ds, count: countMap[ds] || 0 });
  }
  return result;
}

// ── controller ─────────────────────────────────────────────────────────────

exports.getAnalytics = async (req, res) => {
  try {
    const uid = req.user.id;

    const [flashcards, quizzes, exams, totalDocs] = await Promise.all([
      Flashcard.find({ user: uid })
        .select(
          "totalReviews reviewedAt easinessFactor interval lastQuality document",
        )
        .lean(),
      DocumentQuiz.find({ user: uid })
        .select("result createdAt title document questions difficulty")
        .lean(),
      Exam.find({ user: uid })
        .select("result createdAt title difficulty documents")
        .lean(),
      Document.countDocuments({ user: uid }),
    ]);

    // ── overview ───────────────────────────────────────────────────────────
    const totalReviews = flashcards.reduce(
      (s, c) => s + (c.totalReviews || 0),
      0,
    );
    const scoredQuizzes = quizzes
      .map((q) => ({ ...q, _score: extractScore(q.result) }))
      .filter((q) => q._score != null);
    const avgQuizScore =
      scoredQuizzes.length > 0
        ? Math.round(
            scoredQuizzes.reduce((s, q) => s + q._score, 0) /
              scoredQuizzes.length,
          )
        : null;
    const scoredExams = exams
      .map((e) => ({ ...e, _score: extractScore(e.result) }))
      .filter((e) => e._score != null);
    const avgExamScore =
      scoredExams.length > 0
        ? Math.round(
            scoredExams.reduce((s, e) => s + e._score, 0) / scoredExams.length,
          )
        : null;
    const { currentStreak, longestStreak } = computeStreaks(flashcards);

    // ── retention distribution ─────────────────────────────────────────────
    const retention = { mastered: 0, learning: 0, struggling: 0, new: 0 };
    for (const c of flashcards) {
      if (!c.totalReviews) retention.new++;
      else if (c.interval >= 21) retention.mastered++;
      else if (c.interval >= 7) retention.learning++;
      else retention.struggling++;
    }

    // ── quiz score trend (last 20 scored) ─────────────────────────────────
    const quizScores = scoredQuizzes
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .slice(-20)
      .map((q) => ({
        date: q.createdAt,
        score: q._score,
        title: q.title || "Quiz",
      }));

    // ── exam score trend (last 20 scored) ────────────────────────────────────
    const examScores = scoredExams
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .slice(-20)
      .map((e) => ({
        date: e.createdAt,
        score: e._score,
        title: e.title || "Exam",
      }));

    // ── quality distribution ────────────────────────────────────────────────
    const qualityBuckets = [0, 0, 0, 0, 0]; // quality 1-5
    for (const c of flashcards) {
      if (c.lastQuality >= 1 && c.lastQuality <= 5)
        qualityBuckets[c.lastQuality - 1]++;
    }

    // ── document performance ───────────────────────────────────────────────
    const docMap = {};
    for (const q of quizzes) {
      const id = q.document?.toString();
      if (!id) continue;
      if (!docMap[id]) docMap[id] = { scores: [], cards: 0, title: "" };
      if (q.result?.score != null) docMap[id].scores.push(q.result.score);
    }
    for (const c of flashcards) {
      const id = c.document?.toString();
      if (!id) continue;
      if (!docMap[id]) docMap[id] = { scores: [], cards: 0, title: "" };
      docMap[id].cards++;
    }
    const docIds = Object.keys(docMap);
    if (docIds.length > 0) {
      const docs = await Document.find({ _id: { $in: docIds }, user: uid })
        .select("_id title")
        .lean();
      for (const d of docs) docMap[d._id.toString()].title = d.title;
    }
    const documentPerformance = docIds
      .map((id) => ({
        title: docMap[id].title || "Untitled",
        avgScore: docMap[id].scores.length
          ? Math.round(
              docMap[id].scores.reduce((a, b) => a + b, 0) /
                docMap[id].scores.length,
            )
          : null,
        quizCount: docMap[id].scores.length,
        flashcardCount: docMap[id].cards,
      }))
      .filter((d) => d.title !== "Untitled")
      .sort(
        (a, b) =>
          b.flashcardCount + b.quizCount - (a.flashcardCount + a.quizCount),
      )
      .slice(0, 8);

    // ── daily activity & heatmap ───────────────────────────────────────────
    const dailyActivity = computeDailyActivity(flashcards, quizzes, exams, 30);
    const heatmap = computeHeatmap(flashcards, quizzes, exams, 112); // 16 weeks

    res.json({
      overview: {
        totalCards: flashcards.length,
        totalDocuments: totalDocs,
        totalQuizzes: quizzes.length,
        scoredQuizzes: scoredQuizzes.length,
        totalExams: exams.length,
        avgExamScore,
        currentStreak,
        longestStreak,
        totalReviews,
        avgQuizScore,
      },
      dailyActivity,
      quizScores,
      examScores,
      retention,
      qualityBuckets,
      documentPerformance,
      heatmap,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
