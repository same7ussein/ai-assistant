import { Component, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AnalyticsService, AnalyticsData, AnalyticsOverview, HeatmapCell, DailyActivity } from '../../services/analytics.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [TranslocoPipe],
  templateUrl: './analytics.component.html',
})
export class AnalyticsComponent {
  private analytics = inject(AnalyticsService);
  auth = inject(AuthService);

  data = signal<AnalyticsData | null>(null);
  loading = signal(true);
  error = signal('');

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.analytics.get().subscribe({
      next: (res) => {
        this.data.set(this.normalize(res));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to load analytics.');
        this.loading.set(false);
      },
    });
  }

  private normalize(d: AnalyticsData): AnalyticsData {
    return {
      ...d,
      overview: {
        ...d.overview,
        totalExams: d.overview.totalExams ?? 0,
        avgExamScore: d.overview.avgExamScore ?? null,
      },
      examScores: d.examScores ?? [],
      dailyActivity: d.dailyActivity.map(day => ({
        ...day,
        exams: (day as any).exams ?? 0,
      })),
    };
  }

  maxOf(values: number[]): number {
    return Math.max(...values, 1);
  }

  barHeight(value: number, all: number[]): number {
    const max = this.maxOf(all);
    return max > 0 ? (value / max) * 100 : 0;
  }

  maxActivity(items: DailyActivity[] | HeatmapCell[]): number {
    if (items.length === 0) return 0;
    if ('reviews' in items[0]) {
      return Math.max(...(items as DailyActivity[]).map(i => i.reviews + i.quizzes + i.exams), 0);
    }
    return Math.max(...(items as HeatmapCell[]).map(i => i.count), 0);
  }
}
