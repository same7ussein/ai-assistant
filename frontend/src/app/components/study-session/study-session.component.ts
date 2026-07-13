import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { StudySessionService } from '../../services/study-session.service';
import { Flashcard } from '../../models/interfaces';

@Component({
  selector: 'app-study-session',
  standalone: true,
  imports: [RouterLink, FormsModule, TranslocoPipe],
  templateUrl: './study-session.component.html',
})
export class StudySessionComponent implements OnInit {
  private sessionService = inject(StudySessionService);
  private router = inject(Router);

  loading = signal(true);
  starting = signal(false);
  sessionActive = signal(false);
  sessionEnded = signal(false);
  restudyMode = signal(false);

  cards = signal<Flashcard[]>([]);
  currentIndex = signal(0);
  flipped = signal(false);

  sessionId = signal<string | null>(null);
  results = signal<{ cardId: string; quality: number }[]>([]);
  startTime = signal<Date | null>(null);

  summary = signal<{
    totalCards: number;
    avgQuality: number;
    totalTime: number;
    perfectCount: number;
    goodCount: number;
    badCount: number;
  } | null>(null);

  Math = Math;

  get difficultCards(): Flashcard[] {
    const difficultIds = new Set(
      this.results().filter(r => r.quality <= 3).map(r => r.cardId)
    );
    return this.cards().filter(c => difficultIds.has(c._id));
  }

  ngOnInit() {
    this.loadDueCards();
  }

  private loadDueCards() {
    this.loading.set(true);
    this.sessionService.getDueCards(100).subscribe({
      next: (cards) => {
        this.cards.set(cards);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  startSession() {
    this.starting.set(true);
    this.sessionService.startSession().subscribe({
      next: (session) => {
        this.sessionId.set(session._id);
        this.sessionActive.set(true);
        this.starting.set(false);
        this.startTime.set(new Date());
      },
      error: () => this.starting.set(false),
    });
  }

  flipCard() {
    this.flipped.set(true);
  }

  rateCard(quality: number) {
    const card = this.cards()[this.currentIndex()];

    if (this.sessionId()) {
      this.sessionService.reviewInSession(this.sessionId()!, card._id, quality).subscribe();
    }

    this.results.update((r) => [...r, { cardId: card._id, quality }]);

    if (this.currentIndex() < this.cards().length - 1) {
      this.currentIndex.update((i) => i + 1);
      this.flipped.set(false);
    } else {
      this.endSession();
    }
  }

  private endSession() {
    const sid = this.sessionId();
    if (sid) {
      this.sessionService.endSession(sid).subscribe();
    }

    const totalCards = this.results().length;
    const sum = this.results().reduce((a, r) => a + r.quality, 0);
    const avgQuality = totalCards > 0 ? Math.round((sum / totalCards) * 100) / 100 : 0;
    const totalTime = this.startTime()
      ? Math.round((Date.now() - this.startTime()!.getTime()) / 1000)
      : 0;

    const perfectCount = this.results().filter((r) => r.quality === 5).length;
    const goodCount = this.results().filter((r) => r.quality === 4).length;
    const badCount = this.results().filter((r) => r.quality <= 2).length;

    this.summary.set({
      totalCards,
      avgQuality,
      totalTime,
      perfectCount,
      goodCount,
      badCount,
    });

    this.sessionActive.set(false);
    this.sessionEnded.set(true);
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  }

  startRestudy() {
    const difficult = this.difficultCards;
    if (difficult.length === 0) return;

    this.restudyMode.set(true);
    this.cards.set(difficult);
    this.currentIndex.set(0);
    this.flipped.set(false);
    this.sessionActive.set(false);
    this.sessionEnded.set(false);
    this.results.set([]);
    this.summary.set(null);
    this.startSession();
  }

  restart() {
    this.currentIndex.set(0);
    this.flipped.set(false);
    this.sessionActive.set(false);
    this.sessionEnded.set(false);
    this.restudyMode.set(false);
    this.results.set([]);
    this.summary.set(null);
    this.loadDueCards();
  }
}
