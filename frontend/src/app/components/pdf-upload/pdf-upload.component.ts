import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { DocumentService } from '../../services/document.service';
import { FlashcardService } from '../../services/flashcard.service';
import { QuizGenService } from '../../services/quiz-gen.service';
import { AppDocument, Flashcard } from '../../models/interfaces';

@Component({
  selector: 'app-pdf-upload',
  standalone: true,
  imports: [RouterLink, FormsModule, TranslocoPipe],
  templateUrl: './pdf-upload.component.html',
})
export class PdfUploadComponent implements OnInit {
  private docService = inject(DocumentService);
  private flashcardService = inject(FlashcardService);
  private quizGenService = inject(QuizGenService);
  private transloco = inject(TranslocoService);

  docs = signal<AppDocument[]>([]);
  loadingDocs = signal(true);
  uploading = signal(false);
  uploadError = signal('');
  private flashcardCounts = signal<Map<string, number>>(new Map());
  private batchCounts = signal<Map<string, number>>(new Map());
  private quizCounts = signal<Map<string, number>>(new Map());
  loadingBatches = signal(true);
  loadingQuizzes = signal(true);

  // ── Upload modal
  showUploadModal = signal(false);
  uploadTitle = '';
  stagedFile: File | null = null;
  isDragOver = signal(false);

  ngOnInit() {
    this.loadDocs();
    this.flashcardService.list().subscribe((cards) => {
      const counts = new Map<string, number>();
      cards.forEach((c: Flashcard) => {
        const id = c.document._id;
        counts.set(id, (counts.get(id) ?? 0) + 1);
      });
      this.flashcardCounts.set(counts);
    });
    this.flashcardService.listBatches().subscribe({
      next: (batches) => {
        const counts = new Map<string, number>();
        batches.forEach((b) => {
          counts.set(b.document, (counts.get(b.document) ?? 0) + 1);
        });
        this.batchCounts.set(counts);
        this.loadingBatches.set(false);
      },
      error: () => this.loadingBatches.set(false),
    });
    this.quizGenService.list().subscribe({
      next: (quizzes) => {
        const counts = new Map<string, number>();
        quizzes.forEach((q) => {
          counts.set(q.document, (counts.get(q.document) ?? 0) + 1);
        });
        this.quizCounts.set(counts);
        this.loadingQuizzes.set(false);
      },
      error: () => this.loadingQuizzes.set(false),
    });
  }

  private loadDocs() {
    this.loadingDocs.set(true);
    this.docService.list().subscribe({
      next: (d) => {
        this.docs.set(d);
        this.loadingDocs.set(false);
      },
      error: () => {
        this.docs.set([]);
        this.loadingDocs.set(false);
      },
    });
  }

  openModal() {
    this.uploadTitle = '';
    this.stagedFile = null;
    this.uploadError.set('');
    this.showUploadModal.set(true);
  }

  closeModal() {
    this.showUploadModal.set(false);
    this.uploadTitle = '';
    this.stagedFile = null;
    this.uploadError.set('');
  }

  onModalFileSelected(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.stageFile(file);
    (e.target as HTMLInputElement).value = '';
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave() {
    this.isDragOver.set(false);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.isDragOver.set(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) this.stageFile(file);
  }

  private stageFile(file: File) {
    if (file.type !== 'application/pdf') {
      this.uploadError.set(this.transloco.translate('documents.pdfOnly'));
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      this.uploadError.set(this.transloco.translate('documents.fileSizeLimit'));
      return;
    }
    this.stagedFile = file;
    this.uploadError.set('');
    if (!this.uploadTitle) {
      this.uploadTitle = file.name.replace(/\.pdf$/i, '');
    }
  }

  submitUpload() {
    if (!this.stagedFile) {
      this.uploadError.set(this.transloco.translate('documents.selectPdf'));
      return;
    }
    this.uploading.set(true);
    this.uploadError.set('');
    this.docService.upload(this.stagedFile, this.uploadTitle || undefined).subscribe({
      next: () => {
        this.uploading.set(false);
        this.closeModal();
        this.loadDocs();
      },
      error: (e) => {
        this.uploading.set(false);
        this.uploadError.set(e.error?.message || this.transloco.translate('documents.uploadFailed'));
      },
    });
  }

  deleteDoc(id: string, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    if (!confirm(this.transloco.translate('documents.deleteConfirm'))) return;
    this.docService.delete(id).subscribe(() => this.loadDocs());
  }

  getFlashcardCount(docId: string): number {
    return this.flashcardCounts().get(docId) ?? 0;
  }

  getFlashcardSetCount(docId: string): number {
    return this.batchCounts().get(docId) ?? 0;
  }

  getQuizCount(docId: string): number {
    return this.quizCounts().get(docId) ?? 0;
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
}
