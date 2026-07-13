import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { DocumentService } from '../../services/document.service';
import { FlashcardService, FlashcardBatch } from '../../services/flashcard.service';
import { QuizGenService, DocumentQuiz } from '../../services/quiz-gen.service';
import { AuthService } from '../../services/auth.service';
import { AppDocument, ChatMessage, Flashcard, GenQuestion } from '../../models/interfaces';
import { environment } from '../../../environments/environment';
import { MatIconModule } from '@angular/material/icon';

import { NgxDocViewerModule } from 'ngx-doc-viewer';

@Component({
  selector: 'app-pdf-viewer',
  standalone: true,
  imports: [RouterLink, FormsModule, NgxDocViewerModule, MatIconModule, TranslocoPipe],
  templateUrl: './pdf-viewer.component.html',
})
export class PdfViewerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private docService = inject(DocumentService);
  private flashcardService = inject(FlashcardService);
  private quizGenService = inject(QuizGenService);
  private authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);
  private transloco = inject(TranslocoService);

  // ── Document
  doc = signal<AppDocument | null>(null);

  viewerMode = computed(() => {
    const d = this.doc();
    if (!d) return 'url' as const;
    const url = this.getDocumentUrl(d);
    if (!url) return 'url' as const;
    const filePath = (d as any).filePath ?? (d as any).filepath ?? '';
    if (
      typeof filePath === 'string' &&
      (filePath.endsWith('.txt') || filePath.endsWith('.csv') || filePath.endsWith('.json'))
    )
      return 'url' as const;
    return 'pdf' as const;
  });

  // ── Tabs
  tabs = [
    { id: 'content', label: 'Content' },
    { id: 'chat', label: 'Chat' },
    { id: 'ai-actions', label: 'AI Actions' },
    { id: 'flashcards', label: 'Flashcards' },
    { id: 'quizzes', label: 'Quizzes' },
  ];
  activeTab = signal<string>('content');

  // ── Chat
  messages = signal<ChatMessage[]>([
    { role: 'assistant', content: this.transloco.translate('pdfViewer.chatInitial') },
  ]);
  loading = signal(false);
  private _question = signal('');
  get question() {
    return this._question();
  }
  set question(v: string) {
    this._question.set(v);
  }

  userInitial = computed(() => {
    const name = this.authService.user()?.name ?? 'U';
    return name[0]?.toUpperCase() ?? 'U';
  });

  // ── AI Actions
  summarizing = signal(false);
  summaryText = signal('');
  explaining = signal(false);
  explanationText = signal('');
  private _concept = signal('');
  get concept() {
    return this._concept();
  }
  set concept(v: string) {
    this._concept.set(v);
  }

  // ── Modal
  modalOpen = signal(false);
  modalTitle = signal('');
  modalContent = signal('');

  // ── Flashcards
  allCards = signal<Flashcard[]>([]);
  fcBatches = signal<FlashcardBatch[]>([]);
  loadingBatches = signal(true);
  studyCards = signal<Flashcard[]>([]);
  flippedIds = signal<Set<string>>(new Set());
  generatingCards = signal(false);
  showFlashcardGenForm = signal(false);
  flashcardCount = 10;
  // Study view
  studyOpen = signal(false);
  studyIndex = signal(0);
  studyFlipped = signal(false);
  studySeen = signal<Set<number>>(new Set());

  // ── Quizzes
  savedQuizzes = signal<DocumentQuiz[]>([]);
  loadingQuizzes = signal(true);
  activeQuiz = signal<any>(null);
  activeAnswers = signal<number[]>([]);
  quizSubmitted = signal(false);
  generatingQuiz = signal(false);
  showGenForm = signal(false);
  currentQuestionIndex = signal(0);
  quizCount = 5;
  quizDifficulty = 'medium';

  quizScore = computed(() => {
    const q = this.activeQuiz();
    if (!q || !this.quizSubmitted()) return 0;
    const correct = q.questions.filter(
      (item: any, i: any) => this.activeAnswers()[i] === item.correctAnswer,
    ).length;
    return Math.round((correct / q.questions.length) * 100);
  });

  correctCount = computed(() => {
    const q = this.activeQuiz();
    if (!q) return 0;
    return q.questions.filter((item: any, i: any) => this.activeAnswers()[i] === item.correctAnswer)
      .length;
  });

  answeredCount = computed(() => this.activeAnswers().filter((a) => a >= 0).length);

  // ── Toast
  toastMsg = signal('');
  toastVisible = signal(false);

  private get docId() {
    return this.route.snapshot.paramMap.get('id')!;
  }

  ngOnInit() {
    this.docService.get(this.docId).subscribe((d) => {
      this.doc.set(d);
    });
    this.loadAllCards();
    this.loadBatches();
    this.loadSavedQuizzes();
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam) this.activeTab.set(tabParam);
  }

  setTab(id: string) {
    this.activeTab.set(id);
    if (id === 'flashcards') this.loadAllCards();
  }

  // ── Content
  private get fileBaseUrl(): string {
    return environment.apiUrl.replace(/\/api$/, '');
  }

  private encodePath(path: string): string {
    return path
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/');
  }

  getDocumentUrl(doc: AppDocument): string | null {
    const rawPath =
      (doc as any).filePath ?? (doc as any).filepath ?? (doc as any).file_path ?? (doc as any).url;
    if (!rawPath || typeof rawPath !== 'string') return null;

    const normalized = rawPath.trim().replace(/\\/g, '/').replace(/^\.\//, '');
    if (!normalized) return null;

    if (/^https?:\/\//i.test(normalized)) return normalized;

    const withLeadingSlash = normalized.startsWith('/') ? normalized : `/${normalized}`;

    // If backend already returns an uploads-prefixed path, don't duplicate it.
    if (withLeadingSlash.includes('/uploads/')) {
      const encoded = withLeadingSlash
        .split('/')
        .map((part, idx) => (idx === 0 ? part : encodeURIComponent(part)))
        .join('/');
      return `${this.fileBaseUrl}${encoded}`;
    }

    const clean = normalized.replace(/^uploads\//i, '');
    return `${this.fileBaseUrl}/uploads/${this.encodePath(clean)}`;
  }

  openInNewTab(doc: AppDocument) {
    const url = this.getDocumentUrl(doc);
    if (url) {
      window.open(url, '_blank');
    } else {
      const blob = new Blob([doc.content], { type: 'text/plain; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
  }

  // ── Chat
  ask() {
    const q = this.question.trim();
    if (!q || this.loading()) return;
    this.messages.update((m) => [...m, { role: 'user', content: q }]);
    this._question.set('');
    this.loading.set(true);
    this.docService.ask(this.docId, q).subscribe({
      next: (r) => {
        this.messages.update((m) => [...m, { role: 'assistant', content: r.reply }]);
        this.loading.set(false);
      },
      error: () => {
        this.messages.update((m) => [
          ...m,
          { role: 'assistant', content: this.transloco.translate('pdfViewer.chatError') },
        ]);
        this.loading.set(false);
      },
    });
  }

  // ── Modal
  closeModal() {
    this.modalOpen.set(false);
  }
  openModal(title: string, content: string) {
    this.modalTitle.set(title);
    this.modalContent.set(content);
    this.modalOpen.set(true);
  }

  // ── Toast
  showToast(msg: string) {
    this.toastMsg.set(msg);
    this.toastVisible.set(true);
    setTimeout(() => this.toastVisible.set(false), 3000);
  }

  // ── Markdown renderer
  renderMarkdown(text: string): SafeHtml {
    const dark = document.documentElement.classList.contains('dark');
    const codeBg = dark ? 'rgba(255,255,255,0.1)' : '#f3f4f6';
    const codeColor = dark ? '#e2e8f0' : 'inherit';
    const headingColor = dark ? '#f1f5f9' : '#111827';
    const escape = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const inline = (s: string) =>
      escape(s)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(
          /`([^`]+)`/g,
          `<code style="background:${codeBg};color:${codeColor};padding:1px 6px;border-radius:4px;font-size:0.88em;font-family:monospace">$1</code>`,
        );
    const lines = text.split('\n');
    let html = '',
      listItems: string[] = [],
      i = 0;
    const flushList = () => {
      if (listItems.length) {
        html += '<ul style="padding-left:1.4em;margin:10px 0 14px">' + listItems.join('') + '</ul>';
        listItems = [];
      }
    };
    while (i < lines.length) {
      const line = lines[i];
      const hMatch = line.match(/^(#{1,4}) (.+)/);
      if (hMatch) {
        flushList();
        const lvl = hMatch[1].length;
        const sizes = ['20px', '17px', '15px', '14px'];
        html += `<h${lvl + 1} style="font-size:${sizes[lvl - 1]};font-weight:700;color:${headingColor};margin:18px 0 8px">${inline(hMatch[2])}</h${lvl + 1}>`;
        i++;
        continue;
      }
      const bMatch = line.match(/^[\*\-] (.+)/);
      if (bMatch) {
        listItems.push(`<li style="margin-bottom:6px">${inline(bMatch[1])}</li>`);
        i++;
        continue;
      }
      const nMatch = line.match(/^\d+\. (.+)/);
      if (nMatch) {
        listItems.push(`<li style="margin-bottom:6px">${inline(nMatch[1])}</li>`);
        i++;
        continue;
      }
      if (!line.trim()) {
        flushList();
        i++;
        continue;
      }
      flushList();
      const paraLines: string[] = [];
      while (i < lines.length && lines[i].trim() && !lines[i].match(/^(#{1,4} |[\*\-] |\d+\. )/)) {
        paraLines.push(inline(lines[i]));
        i++;
      }
      if (paraLines.length)
        html += `<p style="margin:0 0 14px;line-height:1.75">${paraLines.join('<br>')}</p>`;
    }
    flushList();
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  // ── AI Actions
  summarize() {
    if (this.summarizing()) return;
    this.summarizing.set(true);
    this.docService.ask(this.docId, this.transloco.translate('pdfViewer.summaryPrompt')).subscribe({
      next: (r) => {
        this.openModal(this.transloco.translate('pdfViewer.summaryTitle'), r.reply);
        this.summarizing.set(false);
      },
      error: () => {
        this.openModal(
          this.transloco.translate('pdfViewer.summaryTitle'),
          this.transloco.translate('pdfViewer.summaryFailed'),
        );
        this.summarizing.set(false);
      },
    });
  }

  explain() {
    const c = this.concept.trim();
    if (!c || this.explaining()) return;
    this.explaining.set(true);
    this.docService
      .ask(
        this.docId,
        `Please provide a detailed explanation of "${c}" as it relates to this document.`,
      )
      .subscribe({
        next: (r) => {
          this.openModal(this.transloco.translate('pdfViewer.explainTitle') + ` "${c}"`, r.reply);
          this.explaining.set(false);
        },
        error: () => {
          this.openModal(
            this.transloco.translate('pdfViewer.explainTitle') + ` "${c}"`,
            this.transloco.translate('pdfViewer.explainFailed'),
          );
          this.explaining.set(false);
        },
      });
  }

  // ── Flashcard batch helpers

  loadAllCards() {
    this.flashcardService.list(this.docId).subscribe((c) => this.allCards.set(c));
  }

  loadBatches() {
    this.loadingBatches.set(true);
    this.flashcardService.listBatches(this.docId).subscribe({
      next: (b) => {
        this.fcBatches.set(b);
        this.loadingBatches.set(false);
      },
      error: () => this.loadingBatches.set(false),
    });
  }

  getBatchCards(batch: FlashcardBatch): Flashcard[] {
    const idSet = new Set(batch.cardIds);
    return this.allCards().filter((c) => idSet.has(c._id));
  }

  generateFlashcards() {
    if (this.generatingCards()) return;
    this.generatingCards.set(true);
    this.flashcardService.generate(this.docId, this.flashcardCount).subscribe({
      next: (result) => {
        const newCards = result.cards;
        this.allCards.update((existing) => [...existing, ...newCards]);
        const cardIds = newCards.map((c: Flashcard) => c._id);
        console.log('Generated flashcards:', result);
        this.flashcardService.createBatch(this.docId, cardIds, result.title).subscribe((batch) => {
          this.fcBatches.update((b) => [batch, ...b]);
        });
        this.generatingCards.set(false);
        this.showFlashcardGenForm.set(false);
      },
      error: () => {
        this.generatingCards.set(false);
      },
    });
  }

  openBatchStudy(batch: FlashcardBatch) {
    const batchCards = this.getBatchCards(batch);
    if (!batchCards.length) return;
    this.studyCards.set(batchCards);
    this.studyIndex.set(0);
    this.studyFlipped.set(false);
    this.studySeen.set(new Set());
    this.studyOpen.set(true);
  }

  deleteBatch(batchId: string) {
    this.flashcardService.deleteBatch(batchId).subscribe({
      next: () => {
        this.fcBatches.update((list) => list.filter((b) => b._id !== batchId));
        this.loadAllCards();
      },
    });
  }

  toggleFlip(id: string) {
    this.flippedIds.update((s) => {
      const next = new Set(s);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        this.markCardReviewed(id);
      }
      return next;
    });
  }

  private markCardReviewed(id: string) {
    this.flashcardService.markReviewed(id).subscribe();
  }

  deleteCard(id: string) {
    this.flashcardService.delete(id).subscribe(() => this.loadAllCards());
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (mins < 2) return this.transloco.translate('documents.justNow');
    if (mins < 60) return this.transloco.translate('documents.minutesAgo', { count: mins });
    if (hours < 24) return this.transloco.translate('documents.hoursAgo', { count: hours });
    if (days === 1) return this.transloco.translate('documents.dayAgo');
    return this.transloco.translate('documents.daysAgo', { count: days });
  }

  // Study modal
  openStudy() {
    this.openStudyAt(0);
  }
  openStudyAt(index: number) {
    this.studyIndex.set(index);
    this.studyFlipped.set(false);
    this.studyOpen.set(true);
  }
  closeStudy() {
    this.studyOpen.set(false);
  }

  /** Flip the card. When revealing the answer (false→true) mark this card as seen. */
  flipCard() {
    const revealing = !this.studyFlipped();
    this.studyFlipped.set(revealing);
    if (revealing) {
      const currentCard = this.studyCards()[this.studyIndex()];
      if (currentCard?._id) {
        this.markCardReviewed(currentCard._id);
      }
      this.studySeen.update((s) => {
        const n = new Set(s);
        n.add(this.studyIndex());
        return n;
      });
    }
  }

  prevCard() {
    if (this.studyIndex() > 0) {
      this.studyIndex.update((i) => i - 1);
      this.studyFlipped.set(false);
    }
  }
  nextCard() {
    if (this.studyIndex() < this.studyCards().length - 1) {
      this.studyIndex.update((i) => i + 1);
      this.studyFlipped.set(false);
    }
  }

  // ── Quizzes
  loadSavedQuizzes() {
    this.loadingQuizzes.set(true);
    this.quizGenService.list(this.docId).subscribe({
      next: (q) => {
        this.savedQuizzes.set(q);
        this.loadingQuizzes.set(false);
      },
      error: () => this.loadingQuizzes.set(false),
    });
  }

  generateQuiz() {
    if (this.generatingQuiz()) return;
    this.generatingQuiz.set(true);
    this.quizGenService.generate(this.docId, this.quizCount, this.quizDifficulty).subscribe({
      next: (q) => {
        this.generatingQuiz.set(false);
        this.savedQuizzes.update((list) => {
          const saved = {
            _id: q._id,
            document: this.docId,
            title: q.title,
            questions: q.questions,
            difficulty: q.difficulty ?? this.quizDifficulty,
            result: null,
            createdAt: new Date().toISOString(),
          } as DocumentQuiz;
          return [saved, ...list];
        });
        this.showGenForm.set(false);
        this.showToast(this.transloco.translate('pdfViewer.quizGenerated'));
      },
      error: () => this.generatingQuiz.set(false),
    });
  }

  startQuiz(sq: DocumentQuiz) {
    this.activeQuiz.set(sq);
    this.activeAnswers.set(Array(sq.questions.length).fill(-1));
    this.quizSubmitted.set(false);
    this.currentQuestionIndex.set(0);
  }

  viewResults(sq: DocumentQuiz) {
    this.activeQuiz.set(sq);
    this.activeAnswers.set(sq.result?.answers ?? Array(sq.questions.length).fill(-1));
    this.quizSubmitted.set(true);
    this.currentQuestionIndex.set(0);
  }

  setAnswer(qi: number, oi: number) {
    this.activeAnswers.update((a) => {
      const next = [...a];
      next[qi] = oi;
      return next;
    });
  }

  nextQuestion() {
    const total = this.activeQuiz()?.questions.length ?? 0;
    if (this.currentQuestionIndex() < total - 1) this.currentQuestionIndex.update((i) => i + 1);
  }

  prevQuestion() {
    if (this.currentQuestionIndex() > 0) this.currentQuestionIndex.update((i) => i - 1);
  }

  canSubmit() {
    return this.activeAnswers().every((a) => a >= 0);
  }

  submitActiveQuiz() {
    this.quizSubmitted.set(true);
    const answers = [...this.activeAnswers()];
    const quizId = this.activeQuiz()!._id;
    this.quizGenService.saveResult(quizId, answers).subscribe((updated) => {
      this.savedQuizzes.update((list) => list.map((q) => (q._id === quizId ? updated : q)));
      this.activeQuiz.set(updated);
    });
  }
  closeActiveQuiz() {
    this.activeQuiz.set(null);
    this.loadSavedQuizzes();
  }

  deleteQuiz(id: string) {
    this.quizGenService.delete(id).subscribe(() => {
      this.savedQuizzes.update((list) => list.filter((q) => q._id !== id));
    });
  }

  formatShortDate(dateStr: string): string {
    return new Date(dateStr)
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      .toUpperCase();
  }
}
