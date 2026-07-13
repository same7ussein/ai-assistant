const { PDFParse } = require("pdf-parse");
const fs = require("fs");
const path = require("path");
const Document = require("../models/Document");
const Activity = require("../models/Activity");
const config = require("../config/env");
const { answerFromDocument } = require("../utils/freeAiFallback");
const { isRetryableGeminiError } = require("../utils/geminiRetry");

exports.upload = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "No file uploaded." });

    // Save the original PDF file to disk
    const uploadsDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadsDir))
      fs.mkdirSync(uploadsDir, { recursive: true });
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`;
    fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer);

    const parser = new PDFParse({ data: req.file.buffer });
    const result = await parser.getText();
    const doc = await Document.create({
      title: req.body.title || req.file.originalname.replace(".pdf", ""),
      originalName: req.file.originalname,
      content: result.text,
      fileSize: req.file.size,
      pageCount: result.total,
      filePath: filename,
      user: req.user.id,
    });
    await Activity.create({
      user: req.user.id,
      type: "upload",
      description: `Uploaded "${doc.title}"`,
      document: doc._id,
    });
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.list = async (req, res) => {
  try {
    const docs = await Document.find({ user: req.user.id })
      .select("-content")
      .sort("-createdAt");
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.get = async (req, res) => {
  try {
    const doc = await Document.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!doc) return res.status(404).json({ message: "Document not found." });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const doc = await Document.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!doc) return res.status(404).json({ message: "Document not found." });
    await Activity.deleteMany({ document: doc._id });
    res.json({ message: "Document deleted." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.ask = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question)
      return res.status(400).json({ message: "Question is required." });
    const doc = await Document.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!doc) return res.status(404).json({ message: "Document not found." });
    const context = doc.content.substring(0, 30000);

    if (!config.GEMINI_API_KEY) {
      await Activity.create({
        user: req.user.id,
        type: "question",
        description: `Asked about "${doc.title}" (local mode): "${question.substring(0, 60)}..."`,
        document: doc._id,
      });
      return res.json(answerFromDocument(question, context));
    }

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
                    text: `You are a tutor. Answer the student's question based ONLY on the provided document content. If the answer isn't in the document, say so.\n\nDocument:\n${context}\n\nQuestion: ${question}`,
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

    const reply = await tryModel(0);
    if (!reply) {
      await Activity.create({
        user: req.user.id,
        type: "question",
        description: `Asked about "${doc.title}" (fallback): "${question.substring(0, 60)}..."`,
        document: doc._id,
      });
      return res.json(answerFromDocument(question, context));
    }

    await Activity.create({
      user: req.user.id,
      type: "question",
      description: `Asked about "${doc.title}": "${question.substring(0, 60)}..."`,
      document: doc._id,
    });

    res.json({ reply });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
