import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../../services/auth.service';
import { ActivityService } from '../../services/activity.service';
import { DocumentService } from '../../services/document.service';
import { FlashcardService } from '../../services/flashcard.service';
import { QuizGenService } from '../../services/quiz-gen.service';
import { ExamService } from '../../services/exam.service';
import { Activity } from '../../models/interfaces';
import { StudySessionService } from '../../services/study-session.service';
import type { DueCount } from '../../services/study-session.service';
import { catchError, forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  auth = inject(AuthService);
  private activityService = inject(ActivityService);
  private docService = inject(DocumentService);
  private flashcardService = inject(FlashcardService);
  private quizGenService = inject(QuizGenService);
  private examService = inject(ExamService);
  private studySessionService = inject(StudySessionService);

  activities = signal<Activity[]>([]);
  totalDocs = signal(0);
  totalFlashcards = signal(0);
  totalQuizzes = signal(0);
  totalExams = signal(0);
  dueCount = signal<DueCount | null>(null);
  loadingDashboard = signal(true);

  ngOnInit() {
    forkJoin({
      docs: this.docService.list().pipe(catchError(() => of([]))),
      flashcards: this.flashcardService.list().pipe(catchError(() => of([]))),
      activities: this.activityService.list().pipe(catchError(() => of([]))),
      quizzes: this.quizGenService.list().pipe(catchError(() => of([]))),
      exams: this.examService.list().pipe(catchError(() => of([]))),
      due: this.studySessionService.getDueCount().pipe(catchError(() => of(null))),
    }).subscribe(({ docs, flashcards, activities, quizzes, exams, due }) => {
      this.totalDocs.set(docs.length);
      this.totalFlashcards.set(flashcards.length);
      this.totalQuizzes.set(quizzes.length);
      this.totalExams.set(exams.length);
      this.activities.set(activities);
      this.dueCount.set(due);
      this.loadingDashboard.set(false);
    });
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return (
      d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ', ' +
      d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
  }

  activityLink(activity: Activity): string[] | null {
    if (activity.document?._id) return ['/documents', activity.document._id];
    if (activity.type === 'exam') return ['/exams'];
    if (activity.type === 'roadmap') {
      const target = activity.metadata?.target;
      const description = activity.description.toLowerCase();
      if (target === 'weekly-plan' || description.includes('weekly study plan')) {
        return ['/study-plan'];
      }
      if (target === 'study-roadmap' || description.includes('study roadmap')) {
        return ['/study-roadmap'];
      }
    }
    return null;
  }
}
