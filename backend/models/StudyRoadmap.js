const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  estimatedTime: { type: String },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  type: { type: String, enum: ['document', 'quiz', 'flashcard', 'review', 'practice'], default: 'document' },
  resourceId: { type: String },
  resourceTitle: { type: String },
  completed: { type: Boolean, default: false },
}, { _id: false });

const studyRoadmapSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  title: { type: String, required: true },
  summary: { type: String, required: true },
  strengths: [{ type: String }],
  weakAreas: [{ type: String }],
  recommendedNextSteps: [{ type: String }],
  milestones: [milestoneSchema],
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });



module.exports = mongoose.model('StudyRoadmap', studyRoadmapSchema);
