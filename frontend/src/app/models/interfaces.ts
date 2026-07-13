export interface User {
  _id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface QuizResult {
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AppDocument {
  _id: string;
  title: string;
  originalName: string;
  content: string;
  fileSize: number;
  pageCount: number;
  filePath?: string;
  filepath?: string;
  file_path?: string;
  url?: string;
  user: string;
  createdAt: string;
}

export interface Flashcard {
  _id: string;
  question: string;
  answer: string;
  document: { _id: string; title: string };
  difficulty: string;
  createdAt: string;
}

export interface Activity {
  _id: string;
  type: 'upload' | 'question' | 'flashcard' | 'quiz' | 'exam' | 'roadmap';
  description: string;
  document?: { _id: string; title: string };
  metadata?: { target?: 'weekly-plan' | 'study-roadmap' } & Record<string, any>;
  createdAt: string;
}

export interface GenQuestion {
  question: string;
  options: string[];
  correctAnswer?: number;
  explanation?: string;
}

export interface RoadmapMilestone {
  title: string;
  description: string;
  estimatedTime?: string;
  priority: 'high' | 'medium' | 'low';
  type: 'document' | 'quiz' | 'flashcard' | 'review' | 'practice';
  resourceId?: string;
  resourceTitle?: string;
  completed?: boolean;
}

export interface StudyRoadmap {
  _id: string;
  title: string;
  summary: string;
  strengths: string[];
  weakAreas: string[];
  recommendedNextSteps: string[];
  milestones: RoadmapMilestone[];
  generatedAt: string;
}

export interface WeeklyTask {
  _id: string;
  title: string;
  description: string;
  type: 'flashcard' | 'quiz' | 'exam' | 'review' | 'document' | 'practice';
  duration: number;
  priority: 'high' | 'medium' | 'low';
  source: string;
  sourceId: string;
  completed: boolean;
  completedAt: string | null;
  skipped: boolean;
}

export interface DailyPlan {
  date: string;
  dayOfWeek: number;
  totalMinutes: number;
  tasks: WeeklyTask[];
}

export interface WeeklyStudyPlan {
  _id: string;
  weekStart: string;
  weekEnd: string;
  focusScore: number | null;
  dailyPlans: DailyPlan[];
  weeklyGoal: string;
  strengths: string[];
  weakAreas: string[];
  reflection: string;
  generatedAt: string;
}
