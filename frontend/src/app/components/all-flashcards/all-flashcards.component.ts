import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { FlashcardService } from '../../services/flashcard.service';
import { Flashcard } from '../../models/interfaces';

interface FlashcardSet {
  documentId: string;
  title: string;
  cards: Flashcard[];
  createdAt: string;
}

@Component({
  selector: 'app-all-flashcards',
  standalone: true,
  imports: [TranslocoPipe],
  templateUrl: './all-flashcards.component.html',
})
export class AllFlashcardsComponent implements OnInit {
  private flashcardService = inject(FlashcardService);
  private router = inject(Router);

  flashcardSets = signal<FlashcardSet[]>([]);
  loading = signal(true);
  hoveredId = signal('');
  reviewedIds = signal<Set<string>>(new Set());
  loadingReviewed = signal(true);

  ngOnInit() {
    this.flashcardService.list().subscribe({
      next: (cards) => {
        const groups = new Map<string, FlashcardSet>();
        cards.forEach((card: Flashcard) => {
          const docId = card.document._id;
          if (!groups.has(docId)) {
            groups.set(docId, {
              documentId: docId,
              title: card.document.title,
              cards: [],
              createdAt: card.createdAt,
            });
          }
          const grp = groups.get(docId)!;
          grp.cards.push(card);
          if (new Date(card.createdAt) < new Date(grp.createdAt)) {
            grp.createdAt = card.createdAt;
          }
        });
        this.flashcardSets.set(Array.from(groups.values()));
        this.loading.set(false);
      },
      error: () => {
        this.flashcardSets.set([]);
        this.loading.set(false);
      },
    });

    this.flashcardService.getReviewed().subscribe({
      next: (ids) => { this.reviewedIds.set(new Set(ids)); this.loadingReviewed.set(false); },
      error: () => this.loadingReviewed.set(false),
    });
  }

  studyNow(docId: string) {
    this.router.navigate(['/documents', docId], { queryParams: { tab: 'flashcards' } });
  }

  getReviewedCount(set: FlashcardSet): number {
    const reviewed = this.reviewedIds();
    return set.cards.filter((c) => reviewed.has(c._id)).length;
  }

  getProgress(set: FlashcardSet): number {
    if (!set.cards.length) return 0;
    return Math.round((this.getReviewedCount(set) / set.cards.length) * 100);
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (mins < 2) return 'just now';
    if (mins < 60) return `${mins} minutes ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (days === 1) return 'a day ago';
    return `${days} days ago`;
  }
}