import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AnalyticsOverview {
  totalCards: number;
  totalDocuments: number;
  totalQuizzes: number;
  scoredQuizzes: number;
  totalExams: number;
  avgExamScore: number | null;
  currentStreak: number;
  longestStreak: number;
  totalReviews: number;
  avgQuizScore: number | null;
}

export interface DailyActivity {
  date: string;
  reviews: number;
  quizzes: number;
  exams: number;
}

export interface QuizScorePoint {
  date: string;
  score: number;
  title: string;
}

export interface ExamScorePoint {
  date: string;
  score: number;
  title: string;
}

export interface Retention {
  mastered: number;
  learning: number;
  struggling: number;
  new: number;
}

export interface DocumentPerformance {
  title: string;
  avgScore: number | null;
  quizCount: number;
  flashcardCount: number;
}

export interface HeatmapCell {
  date: string;
  count: number;
}

export interface AnalyticsData {
  overview: AnalyticsOverview;
  dailyActivity: DailyActivity[];
  quizScores: QuizScorePoint[];
  examScores: ExamScorePoint[];
  retention: Retention;
  qualityBuckets: number[];
  documentPerformance: DocumentPerformance[];
  heatmap: HeatmapCell[];
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private http = inject(HttpClient);
  private api = environment.apiUrl + '/analytics';

  get(): Observable<AnalyticsData> {
    return this.http.get<AnalyticsData>(this.api);
  }
}
