import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { ExamService, Exam, ExamQuestion, ExamGenerateResponse } from '../../services/exam.service';
import { DocumentService } from '../../services/document.service';
import { AppDocument } from '../../models/interfaces';

@Component({
  selector: 'app-exam-generator',
  standalone: true,
  imports: [FormsModule, DatePipe, TranslocoPipe],
  templateUrl: './exam-generator.component.html',
})
export class ExamGeneratorComponent {
  private examService = inject(ExamService);
  private docService = inject(DocumentService);

  documents = signal<AppDocument[]>([]);
  loadingDocs = signal(true);
  selectedDocIds = signal<string[]>([]);
  step = signal<'select' | 'generate'>('select');

  count = 5;
  difficulty = 'medium';
  generating = signal(false);
  error = signal('');
  savingResult = signal(false);

  exam = signal<ExamGenerateResponse | null>(null);
  savedExamId = signal<string | null>(null);
  savedExams = signal<Exam[]>([]);
  answers = signal<(number | string)[]>([]);
  submitted = signal(false);
  shortAnswers = signal<Record<number, string>>({});
  lastScore = signal<number | null>(null);
  resultQuestions = signal<ExamQuestion[]>([]);

  constructor() {
    this.loadDocuments();
    this.loadSavedExams();
  }

  loadDocuments() {
    this.loadingDocs.set(true);
    this.docService.list().subscribe({
      next: (docs) => { this.documents.set(docs); this.loadingDocs.set(false); },
      error: () => this.loadingDocs.set(false),
    });
  }

  loadSavedExams() {
    this.examService.list().subscribe({
      next: (exams) => this.savedExams.set(exams),
    });
  }

  toggleDoc(id: string) {
    this.selectedDocIds.update((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  }

  goToGenerate() {
    if (this.selectedDocIds().length === 0) return;
    this.step.set('generate');
  }

  score = computed(() => this.lastScore() ?? 0);
  correctCount = computed(() => {
    const s = this.lastScore();
    const qs = this.exam();
    if (s == null || !qs) return 0;
    return Math.round((s / 100) * qs.questions.length);
  });

  setAnswer(idx: number, value: number) {
    this.answers.update((a) => { a[idx] = value; return [...a]; });
  }

  setShortAnswer(idx: number, value: string) {
    this.shortAnswers.update((m) => ({ ...m, [idx]: value }));
  }

  canSubmit() {
    if (!this.exam()) return false;
    return this.exam()!.questions.every((q, i) => {
      if (q.type === 'short-answer') {
        const sa = this.shortAnswers()[i];
        return sa != null && sa.trim().length > 0;
      }
      return typeof this.answers()[i] === 'number' && (this.answers()[i] as number) >= 0;
    });
  }

  generate() {
    this.generating.set(true);
    this.error.set('');
    this.examService.generate(this.selectedDocIds(), this.count, this.difficulty).subscribe({
      next: (r) => {
        this.exam.set(r);
        this.savedExamId.set(r._id);
        this.answers.set(new Array(r.questions.length).fill(-1));
        this.shortAnswers.set({});
        this.submitted.set(false);
        this.lastScore.set(null);
        this.resultQuestions.set([]);
        this.generating.set(false);
      },
      error: (e) => {
        this.generating.set(false);
        this.error.set(e.error?.message || 'exam.generationFailed');
      },
    });
  }

  submitExam() {
    if (!this.canSubmit() || !this.savedExamId()) return;
    const qs = this.exam()!.questions;
    this.answers.update((a) => {
      qs.forEach((q, i) => { if (q.type === 'short-answer') a[i] = this.shortAnswers()[i] || ''; });
      return [...a];
    });
    this.submitted.set(true);

    this.savingResult.set(true);
    this.examService.saveResult(this.savedExamId()!, this.answers()).subscribe({
      next: (updated) => {
        this.lastScore.set(updated.result?.score ?? 0);
        this.resultQuestions.set(updated.questions);
        this.exam.set({
          _id: updated._id,
          title: updated.title,
          questions: updated.questions,
          documentIds: updated.documents,
          difficulty: updated.difficulty,
        });
        this.savedExams.update((list) => {
          const idx = list.findIndex(e => e._id === updated._id);
          if (idx >= 0) list[idx] = updated;
          else list.unshift(updated);
          return [...list];
        });
        this.savingResult.set(false);
      },
      error: () => this.savingResult.set(false),
    });
  }

  viewSavedExam(saved: Exam) {
    this.exam.set({ questions: saved.questions, title: saved.title, documentIds: saved.documents, _id: saved._id, difficulty: saved.difficulty });
    this.savedExamId.set(saved._id);
    this.answers.set(saved.result?.answers || new Array(saved.questions.length).fill(-1));
    this.shortAnswers.set({});
    if (saved.result) {
      this.submitted.set(true);
      this.lastScore.set(saved.result.score);
      this.resultQuestions.set(saved.questions);
    } else {
      this.submitted.set(false);
      this.lastScore.set(null);
      this.resultQuestions.set([]);
      this.answers.set(new Array(saved.questions.length).fill(-1));
    }
    this.step.set('generate');
  }

  reset() {
    this.exam.set(null);
    this.submitted.set(false);
    this.answers.set([]);
    this.shortAnswers.set({});
    this.savedExamId.set(null);
    this.lastScore.set(null);
    this.resultQuestions.set([]);
    this.step.set('select');
  }

  retakeExam() {
    this.answers.set(new Array(this.exam()!.questions.length).fill(-1));
    this.shortAnswers.set({});
    this.submitted.set(false);
    this.lastScore.set(null);
    this.resultQuestions.set([]);
  }

  deleteExam(id: string) {
    this.examService.delete(id).subscribe({
      next: () => this.savedExams.update((list) => list.filter((e) => e._id !== id)),
    });
  }

  isShortAnswerCorrect(idx: number): boolean {
    const q = this.resultQuestions()[idx];
    if (!q || q.type !== 'short-answer' || q.correctAnswer == null) return false;
    const ans = this.answers()[idx];
    return typeof ans === 'string' && typeof q.correctAnswer === 'string' &&
      ans.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
  }

  mcCount(qs: ExamQuestion[]) { return qs.filter(q => q.type === 'multiple-choice').length; }
  tfCount(qs: ExamQuestion[]) { return qs.filter(q => q.type === 'true-false').length; }
  saCount(qs: ExamQuestion[]) { return qs.filter(q => q.type === 'short-answer').length; }

  docSize(doc: AppDocument): string {
    const len = doc.content?.length || 0;
    return len > 1000 ? '~' + (len / 1000).toFixed(1) + 'K chars' : len + ' chars';
  }
}
