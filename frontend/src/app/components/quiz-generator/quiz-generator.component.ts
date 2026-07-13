import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { QuizGenService, QuizGenerateResponse } from '../../services/quiz-gen.service';
import { GenQuestion } from '../../models/interfaces';

@Component({
  selector: 'app-quiz-generator',
  standalone: true,
  imports: [FormsModule, TranslocoPipe],
  templateUrl: './quiz-generator.component.html',
})
export class QuizGeneratorComponent {
  private route = inject(ActivatedRoute);
  private quizGenService = inject(QuizGenService);
  count = 5;
  difficulty = 'medium';
  generating = signal(false);
  error = signal('');
  submitting = signal(false);
  quiz = signal<QuizGenerateResponse | null>(null);
  answers = signal<number[]>([]);
  submitted = signal(false);
  lastScore = signal<number | null>(null);
  resultQuestions = signal<GenQuestion[]>([]);
  score = computed(() => this.lastScore() ?? 0);
  correctCount = computed(() => {
    const s = this.lastScore();
    const qs = this.quiz();
    if (s == null || !qs) return 0;
    return Math.round((s / 100) * qs.questions.length);
  });
  private get docId() {
    return this.route.snapshot.paramMap.get('id')!;
  }
  setAnswer(idx: number, value: number) {
    this.answers.update((a) => {
      a[idx] = value;
      return [...a];
    });
  }
  canSubmit() {
    return this.answers().every((a) => a >= 0);
  }
  generate() {
    this.generating.set(true);
    this.error.set('');
    this.quizGenService.generate(this.docId, this.count, this.difficulty).subscribe({
      next: (r) => {
        this.quiz.set(r);
        this.answers.set(new Array(r.questions.length).fill(-1));
        this.submitted.set(false);
        this.lastScore.set(null);
        this.resultQuestions.set([]);
        this.generating.set(false);
      },
      error: (e) => {
        this.generating.set(false);
        this.error.set(e.error?.message || 'quiz.generationFailed');
      },
    });
  }
  submitQuiz() {
    if (!this.canSubmit() || !this.quiz()) return;
    this.submitted.set(true);
    this.submitting.set(true);
    this.quizGenService.saveResult(this.quiz()!._id, this.answers()).subscribe({
      next: (updated) => {
        this.lastScore.set(updated.result?.score ?? 0);
        this.resultQuestions.set(updated.questions);
        this.quiz.set({
          _id: updated._id,
          title: updated.title,
          questions: updated.questions,
          difficulty: updated.difficulty,
        });
        this.submitting.set(false);
      },
      error: () => this.submitting.set(false),
    });
  }
  reset() {
    this.quiz.set(null);
    this.submitted.set(false);
    this.answers.set([]);
    this.lastScore.set(null);
    this.resultQuestions.set([]);
  }
}
