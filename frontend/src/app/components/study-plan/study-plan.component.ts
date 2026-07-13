import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { StudyPlanService } from '../../services/study-plan.service';
import { WeeklyStudyPlan, DailyPlan, WeeklyTask } from '../../models/interfaces';

@Component({
  selector: 'app-study-plan',
  standalone: true,
  imports: [DatePipe, NgClass, TranslocoPipe],
  templateUrl: './study-plan.component.html',
})
export class StudyPlanComponent implements OnInit {
  private planService = inject(StudyPlanService);

  plan = signal<WeeklyStudyPlan | null>(null);
  loading = signal(true);
  generating = signal(false);
  error = signal<string | null>(null);
  activeDay = signal<number>(this.getTodayIndex());

  weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  Math = Math;

  get totalWeeklyMinutes(): number {
    const p = this.plan();
    if (!p) return 0;
    return p.dailyPlans.reduce((sum, d) => sum + d.totalMinutes, 0);
  }

  get completedMinutes(): number {
    const p = this.plan();
    if (!p) return 0;
    return p.dailyPlans.reduce((sum, d) =>
      sum + d.tasks.filter(t => t.completed).reduce((s, t) => s + t.duration, 0), 0);
  }

  get progressPercent(): number {
    const total = this.totalWeeklyMinutes;
    return total > 0 ? Math.round((this.completedMinutes / total) * 100) : 0;
  }

  get todayTasks(): WeeklyTask[] {
    const p = this.plan();
    if (!p) return [];
    const today = p.dailyPlans.find(d => d.dayOfWeek === this.activeDay());
    return today ? today.tasks : [];
  }

  get todayMinutes(): number {
    const p = this.plan();
    if (!p) return 0;
    const today = p.dailyPlans.find(d => d.dayOfWeek === this.activeDay());
    return today ? today.totalMinutes : 0;
  }

  get completedTodayMinutes(): number {
    const p = this.plan();
    if (!p) return 0;
    const today = p.dailyPlans.find(d => d.dayOfWeek === this.activeDay());
    return today ? today.tasks.filter(t => t.completed).reduce((s, t) => s + t.duration, 0) : 0;
  }

  ngOnInit() {
    this.load();
  }

  private getTodayIndex(): number {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1;
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.planService.getCurrentPlan().subscribe({
      next: (p) => {
        if (p) {
          this.plan.set(p);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  generate() {
    this.generating.set(true);
    this.error.set(null);
    this.planService.generatePlan().subscribe({
      next: (p) => {
        this.plan.set(p);
        this.generating.set(false);
        this.activeDay.set(this.getTodayIndex());
      },
      error: () => {
        this.generating.set(false);
        this.error.set('studyPlan.generateFailed');
      },
    });
  }

  toggleTask(task: WeeklyTask) {
    this.planService.updateTask(task._id, { completed: !task.completed }).subscribe({
      next: (updated) => this.plan.set(updated),
    });
  }

  skipTask(task: WeeklyTask) {
    this.planService.updateTask(task._id, { skipped: !task.skipped }).subscribe({
      next: (updated) => this.plan.set(updated),
    });
  }

  setActiveDay(index: number) {
    this.activeDay.set(index);
  }

  getDayAbbreviation(index: number): string {
    return this.weekDays[index].slice(0, 3);
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'high': return 'border-l-red-400 bg-red-50 dark:bg-red-900/10';
      case 'medium': return 'border-l-amber-400 bg-amber-50 dark:bg-amber-900/10';
      case 'low': return 'border-l-emerald-400 bg-emerald-50 dark:bg-emerald-900/10';
      default: return 'border-l-gray-400 bg-gray-50 dark:bg-gray-800';
    }
  }

  getPriorityDot(priority: string): string {
    switch (priority) {
      case 'high': return 'bg-red-400';
      case 'medium': return 'bg-amber-400';
      case 'low': return 'bg-emerald-400';
      default: return 'bg-gray-400';
    }
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'flashcard': return 'studyPlan.typeFlashcard';
      case 'quiz': return 'studyPlan.typeQuiz';
      case 'exam': return 'studyPlan.typeExam';
      case 'review': return 'studyPlan.typeReview';
      case 'document': return 'studyPlan.typeDocument';
      case 'practice': return 'studyPlan.typePractice';
      default: return 'studyPlan.typeTask';
    }
  }

  getDayStatus(index: number): 'completed' | 'partial' | 'pending' | 'future' {
    const p = this.plan();
    if (!p) return 'future';
    const day = p.dailyPlans.find(d => d.dayOfWeek === index);
    if (!day) return 'future';
    const total = day.tasks.length;
    if (total === 0) return 'future';
    const done = day.tasks.filter(t => t.completed).length;
    if (done === total) return 'completed';
    if (done > 0) return 'partial';
    return 'pending';
  }
}
