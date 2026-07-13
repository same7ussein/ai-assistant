function toSentences(text) {
  if (!text) return [];
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);
}

function keywords(text) {
  return Array.from(
    new Set(
      (text.toLowerCase().match(/[a-z0-9]{3,}/g) || []).filter(
        (w) =>
          ![
            "this",
            "that",
            "with",
            "from",
            "have",
            "what",
            "when",
            "where",
            "which",
            "about",
            "into",
            "your",
            "will",
            "would",
            "there",
            "their",
            "they",
            "them",
            "been",
            "were",
            "than",
            "then",
            "also",
            "only",
            "because",
            "while",
            "should",
          ].includes(w),
      ),
    ),
  );
}

function scoreSentence(sentence, keys) {
  if (!keys.length) return 0;
  const lower = sentence.toLowerCase();
  let score = 0;
  for (const key of keys) {
    if (lower.includes(key)) score += 1;
  }
  return score;
}

function topRelevantSentences(text, query, limit = 4) {
  const sents = toSentences(text);
  const keys = keywords(query);

  return sents
    .map((s) => ({ s, score: scoreSentence(s, keys) }))
    .sort((a, b) => b.score - a.score || b.s.length - a.s.length)
    .slice(0, limit)
    .map((x) => x.s);
}

function buildStudyTips(query) {
  const topic = (query || "this topic").trim();
  return [
    `1) Define the core idea of "${topic}" in one sentence.`,
    "2) Write a simple real-world example.",
    "3) List two common mistakes and how to avoid them.",
    "4) Test yourself with a short question and answer it without notes.",
  ].join("\n");
}

function chatFallback(message) {
  const relevant = topRelevantSentences(message, message, 1)[0];
  const interpretation = relevant || message;

  return {
    reply: `**AI Learning Assistant (Free Local Mode)**\n\nI can still help without an external AI service.\n\nYou asked: "${message}"\n\nQuick guidance:\n- Break the topic into small parts.\n- Learn one concept, then practice immediately.\n- Use spaced repetition and short self-quizzes.\n\nSuggested plan:\n${buildStudyTips(interpretation)}`,
  };
}

function answerFromDocument(question, documentText) {
  const snippets = topRelevantSentences(documentText, question, 4);

  if (!snippets.length || snippets.every((s) => s.length < 20)) {
    return {
      reply: `I could not find a confident answer in the document for: "${question}". Try asking with a more specific keyword from the text.`,
    };
  }

  return {
    reply: `**Answer (Free Local Mode)**\n\nBased on the document, this is most relevant to your question:\n\n${snippets
      .map((s, idx) => `${idx + 1}. ${s}`)
      .join(
        "\n\n",
      )}\n\nIf you want, I can turn this into a short summary or flashcards.`,
  };
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function normalizeDifficulty(difficulty) {
  if (difficulty === "easy") return "easy";
  if (difficulty === "hard") return "hard";
  return "medium";
}

function generateLocalQuiz(documentText, count = 5, difficulty = "medium") {
  const diff = normalizeDifficulty(difficulty);
  const sentences = toSentences(documentText).slice(0, 80);
  const safeCount = Math.min(Math.max(Number(count) || 5, 1), 20);

  if (sentences.length < 4) {
    return {
      title: "Quick Knowledge Check",
      questions: [
        {
          question: "What is the main topic of the document?",
          options: [
            "The primary concept discussed in the text",
            "An unrelated historical event",
            "A random mathematical theorem",
            "A fictional character biography",
          ],
          correctAnswer: 0,
        },
      ],
    };
  }

  const selected = shuffle(sentences).slice(0, safeCount);
  const topKeywords = keywords(documentText).slice(0, 2).join(" & ");
  const title = topKeywords ? `Challenge: ${topKeywords}` : "Knowledge Check";

  return {
    title,
    questions: selected.map((correctSentence, idx) => {
      const distractorPool = sentences.filter((s) => s !== correctSentence);
      const distractors = shuffle(distractorPool).slice(0, 3);

      while (distractors.length < 3) {
        distractors.push("This option is not supported by the document.");
      }

      const options = shuffle([correctSentence, ...distractors]);
      const correctAnswer = options.findIndex((opt) => opt === correctSentence);

      const prefix =
        diff === "easy"
          ? "According to the document, which statement is correct?"
          : diff === "hard"
            ? "Which statement is best supported by the document context?"
            : "Which option matches the document content?";

      return {
        question: `${prefix}`,
        options,
        correctAnswer,
      };
    }),
  };
}

function generateLocalFlashcards(documentText, count = 5) {
  const sentences = toSentences(documentText).slice(0, 120);
  const safeCount = Math.min(Math.max(Number(count) || 5, 1), 20);

  if (sentences.length < 2) {
    return {
      title: "Quick Study Cards",
      cards: [
        {
          question: "What is the main idea of this document?",
          answer:
            "The document explains its primary topic and supporting details.",
        },
      ],
    };
  }

  const selected = shuffle(sentences).slice(0, safeCount);
  const topKeywords = keywords(documentText).slice(0, 2).join(" & ");

  return {
    title: topKeywords ? `Smart Cards: ${topKeywords}` : "Smart Cards",
    cards: selected.map((sentence) => ({
      question: `Explain this key point in your own words.`,
      answer: sentence,
    })),
  };
}

function generateLocalRoadmap(userData) {
  const { documentCount, flashcardCount, quizCount } = userData;

  const milestones = [];
  const recommendedNextSteps = [];

  if (documentCount === 0) {
    milestones.push({
      title: "Upload Your First Learning Material",
      description:
        "Start by uploading a PDF or document related to a topic you want to learn. This will unlock AI-powered flashcards, quizzes, and Q&A.",
      estimatedTime: "15 minutes",
      priority: "high",
      type: "document",
    });
    recommendedNextSteps.push(
      "Upload a PDF document to begin your AI-powered learning journey",
    );
  }

  if (documentCount > 0 && quizCount === 0) {
    milestones.push({
      title: "Test Your Knowledge with a Quiz",
      description: `You have ${documentCount} document(s). Generate a quiz from one of them to assess your understanding and identify knowledge gaps.`,
      estimatedTime: "20-30 minutes",
      priority: "high",
      type: "quiz",
    });
    recommendedNextSteps.push(
      "Generate a quiz from your most important document",
    );
  }

  if (documentCount > 0 && flashcardCount === 0) {
    milestones.push({
      title: "Create Flashcards for Active Recall",
      description:
        "Flashcards help reinforce key concepts through spaced repetition. Generate a batch from your document.",
      estimatedTime: "15 minutes",
      priority: "medium",
      type: "flashcard",
    });
    recommendedNextSteps.push(
      "Create flashcards from your document for better retention",
    );
  }

  if (milestones.length === 0) {
    milestones.push({
      title: "Explore Advanced Topics",
      description:
        "You have a solid foundation! Consider uploading more advanced materials or exploring new subject areas.",
      estimatedTime: "Ongoing",
      priority: "medium",
      type: "practice",
    });
    recommendedNextSteps.push(
      "Upload advanced materials on topics you want to master",
    );
  }

  if (recommendedNextSteps.length === 0) {
    if (documentCount === 0) {
      recommendedNextSteps.push("Upload a PDF document to get started");
    } else {
      recommendedNextSteps.push(
        "Generate a quiz from your document to assess understanding",
      );
    }
  }

  return {
    title: `${documentCount > 0 ? "Personalized" : "Getting Started"} Study Roadmap`,
    summary:
      documentCount === 0
        ? "You are just getting started! Begin by uploading learning materials. Your personalized roadmap will evolve as you progress."
        : `You have ${documentCount} document(s) and ${flashcardCount} flashcard(s). This roadmap is tailored to help you build on your strengths and address areas needing improvement.`,
    strengths: ["Ready to learn"],
    weakAreas: ["Building foundational knowledge"],
    recommendedNextSteps,
    milestones,
  };
}

function generateLocalWeeklyPlan(userData) {
  const {
    documentCount,
    flashcardCount,
    dueCount,
    quizCount,
    examCount,
    weakTopics,
    avgQuizScore,
    currentStreak,
    studySessions,
  } = userData;

  const weekDays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const dailyPlans = [];
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const taskPool = [];
  const weakSet = new Set((weakTopics || []).map((t) => t.toLowerCase()));

  if (flashcardCount > 0 || dueCount > 0) {
    const reviewMinutes = Math.min(
      Math.max(Math.round(dueCount * 1.5), 10),
      45,
    );
    const topics =
      weakSet.size > 0 ? [...weakSet].slice(0, 3).join(", ") : "key concepts";
    taskPool.push({
      title: `Review flashcards (${reviewMinutes} min)`,
      description:
        weakSet.size > 0
          ? `Focus on weak areas: ${topics}`
          : "Keep up with your spaced repetition schedule",
      type: "flashcard",
      duration: reviewMinutes,
      priority: dueCount > 10 ? "high" : "medium",
      source: `${dueCount} cards due for review`,
    });
  }

  if (quizCount > 0 && avgQuizScore != null && avgQuizScore < 80) {
    const weakTopic = weakSet.size > 0 ? [...weakSet][0] : "your weakest area";
    taskPool.push({
      title: `Quiz yourself on: ${weakTopic}`,
      description: `Your average quiz score is ${avgQuizScore}%. Take a targeted quiz to improve.`,
      type: "quiz",
      duration: 15,
      priority: "high",
      source: `Weak topic: ${weakTopic}`,
    });
  }

  if (documentCount > 0 && flashcardCount < documentCount * 5) {
    taskPool.push({
      title: "Generate new flashcards",
      description:
        "Create flashcards from your documents to reinforce learning",
      type: "flashcard",
      duration: 20,
      priority: "medium",
      source: `${documentCount} documents available`,
    });
  }

  if (avgQuizScore != null && avgQuizScore < 60 && quizCount > 0) {
    const lowTopic = weakSet.size > 0 ? [...weakSet][0] : "foundational topics";
    taskPool.push({
      title: `Review mistakes on: ${lowTopic}`,
      description: "Redo questions you got wrong to solidify understanding",
      type: "review",
      duration: 20,
      priority: "high",
      source: `Low score area: ${lowTopic}`,
    });
  }

  if (documentCount > 0 && quizCount < documentCount * 2) {
    taskPool.push({
      title: "Take a practice quiz",
      description: "Test your knowledge with a new quiz from your documents",
      type: "quiz",
      duration: 15,
      priority: "low",
      source: `${documentCount} documents`,
    });
  }

  if (examCount > 0) {
    taskPool.push({
      title: "Review recent exam mistakes",
      description: "Analyze exam results and reattempt incorrect answers",
      type: "exam",
      duration: 25,
      priority: "medium",
      source: `${examCount} exams taken`,
    });
  }

  if (taskPool.length < 3) {
    taskPool.push({
      title: "Upload new learning material",
      description: "Find a topic you want to master and upload a PDF",
      type: "document",
      duration: 10,
      priority: "low",
      source: "Explore new topics",
    });
    taskPool.push({
      title: "Study session - active recall",
      description:
        "Open a document and practice active recall by summarizing key points",
      type: "practice",
      duration: 20,
      priority: "low",
      source: "General practice",
    });
  }

  const avgMinutes = Math.min(
    Math.max(
      studySessions?.reduce((s, ss) => s + (ss.duration || 20), 0) /
        Math.max(studySessions?.length || 1, 1),
      15,
    ),
    60,
  );

  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const isWeekend = i >= 5;
    const tasksCount = isWeekend
      ? Math.min(taskPool.length, 2)
      : Math.min(taskPool.length, 4);
    const dayTasks = [];
    const shuffled = [...taskPool].sort(() => Math.random() - 0.5);

    for (let t = 0; t < tasksCount && t < shuffled.length; t++) {
      const task = { ...shuffled[t] };
      if (isWeekend && t === 0) {
        task.priority = "medium";
      }
      dayTasks.push(task);
    }

    const totalMin = dayTasks.reduce((s, t) => s + t.duration, 0);
    dailyPlans.push({
      date: day.toISOString(),
      dayOfWeek: i,
      totalMinutes: Math.max(totalMin, isWeekend ? 20 : avgMinutes),
      tasks: dayTasks,
    });
  }

  const allWeak = weakSet.size > 0 ? [...weakSet] : ["Review fundamentals"];
  const allStrengths =
    currentStreak > 0
      ? [`Consistent learner (${currentStreak}-day streak)`, "Making progress"]
      : ["Ready to start learning", "Motivated to improve"];

  return {
    weekStart: monday.toISOString(),
    weekEnd: new Date(monday.getTime() + 6 * 86400000).toISOString(),
    focusScore: Math.min(100, Math.max(40, 60 + (currentStreak || 0) * 2)),
    dailyPlans,
    weeklyGoal:
      dueCount > 0
        ? `Clear your ${dueCount} pending reviews and strengthen weak areas`
        : "Build momentum by learning new material daily",
    strengths: allStrengths,
    weakAreas: allWeak,
  };
}

module.exports = {
  chatFallback,
  answerFromDocument,
  generateLocalQuiz,
  generateLocalFlashcards,
  generateLocalRoadmap,
  generateLocalWeeklyPlan,
};
