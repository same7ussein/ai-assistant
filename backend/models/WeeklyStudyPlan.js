const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  type: {
    type: String,
    enum: ['flashcard', 'quiz', 'exam', 'review', 'document', 'practice'],
    default: 'review',
  },
  duration: { type: Number, default: 20 },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium',
  },
  source: { type: String, default: '' },
  sourceId: { type: String, default: '' },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
  skipped: { type: Boolean, default: false },
}, { _id: true });

const dailyPlanSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  dayOfWeek: { type: Number, min: 0, max: 6, required: true },
  totalMinutes: { type: Number, default: 0 },
  tasks: [taskSchema],
}, { _id: false });

const weeklyStudyPlanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  weekStart: { type: Date, required: true },
  weekEnd: { type: Date, required: true },
  focusScore: { type: Number, default: null },
  dailyPlans: [dailyPlanSchema],
  weeklyGoal: { type: String, default: '' },
  strengths: [String],
  weakAreas: [String],
  reflection: { type: String, default: '' },
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

weeklyStudyPlanSchema.index({ user: 1, weekStart: -1 });

module.exports = mongoose.model('WeeklyStudyPlan', weeklyStudyPlanSchema);
