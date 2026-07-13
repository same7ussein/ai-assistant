const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const config = require("./config/env");

const authRoutes = require("./routes/auth");
const aiRoutes = require("./routes/ai");
const documentRoutes = require("./routes/documents");
const flashcardRoutes = require("./routes/flashcards");
const quizGenRoutes = require("./routes/quizGen");
const activityRoutes = require("./routes/activities");
const flashcardBatchRoutes = require("./routes/flashcardBatches");
const documentQuizRoutes = require("./routes/documentQuizzes");
const studyRoadmapRoutes = require("./routes/studyRoadmap");
const studySessionRoutes = require("./routes/studySessions");
const analyticsRoutes = require("./routes/analytics");
const examGenRoutes = require("./routes/examGen");
const examRoutes = require("./routes/exams");
const studyPlanRoutes = require("./routes/studyPlans");

const app = express();

connectDB();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(cors({ origin: true, credentials: true }));
// app.use(limiter);
app.use(express.json({ limit: "50mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.disable("etag");
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/flashcards", flashcardRoutes);
app.use("/api/quiz-gen", quizGenRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/flashcard-batches", flashcardBatchRoutes);
app.use("/api/document-quizzes", documentQuizRoutes);
app.use("/api/study-roadmap", studyRoadmapRoutes);
app.use("/api/study-sessions", studySessionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/exam-gen", examGenRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/study-plan", studyPlanRoutes);

app.get("/api/health", (_, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() }),
);

const frontendDist = path.join(__dirname, "../frontend/dist/frontend/browser");

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));

  app.get("*", (req, res, next) => {
    if (
      req.path === "/api" ||
      req.path.startsWith("/api/") ||
      req.path === "/uploads" ||
      req.path.startsWith("/uploads/")
    ) {
      return next();
    }

    return res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.use((req, res, next) => {
  if (req.path === "/api" || req.path.startsWith("/api/")) {
    return res.status(404).json({ message: "Route not found." });
  }

  return next();
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error." });
});

app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
});
