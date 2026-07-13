import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { FlashcardService } from '../../services/flashcard.service';
import { Flashcard } from '../../models/interfaces';

@Component({
  selector: 'app-my-flashcards',
  standalone: true,
  imports: [FormsModule, TranslocoPipe],
  templateUrl: './my-flashcards.component.html',
})
export class MyFlashcardsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private cardService = inject(FlashcardService);
  cards = signal<Flashcard[]>([]);
  loadingCards = signal(true);
  flippedIds = signal<Set<string>>(new Set());
  genCount = 5;
  generating = signal(false);
  error = signal('');
  private get docId() {
    return this.route.snapshot.paramMap.get('id')!;
  }
  ngOnInit() {
    this.loadCards();
  }
  private loadCards() {
    this.loadingCards.set(true);
    this.cardService.list(this.docId).subscribe({
      next: (c) => { this.cards.set(c); this.loadingCards.set(false); },
      error: () => this.loadingCards.set(false),
    });
  }
  toggleFlip(id: string) {
    this.flippedIds.update((s) => {
      const n = new Set(s);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
        this.markCardReviewed(id);
      }
      return n;
    });
  }

  private markCardReviewed(id: string) {
    this.cardService.markReviewed(id).subscribe();
  }
  generate() {
    if (this.generating()) return;
    this.generating.set(true);
    this.error.set('');
    this.cardService.generate(this.docId, this.genCount).subscribe({
      next: () => {
        this.generating.set(false);
        this.loadCards();
      },
      error: (e) => {
        this.generating.set(false);
        this.error.set(e.error?.message || 'flashcards.generationFailed');
      },
    });
  }
  deleteCard(id: string) {
    this.cardService.delete(id).subscribe(() => this.loadCards());
  }
}
