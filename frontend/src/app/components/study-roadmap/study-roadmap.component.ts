import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { RoadmapService } from '../../services/roadmap.service';
import { StudyRoadmap } from '../../models/interfaces';

@Component({
  selector: 'app-study-roadmap',
  standalone: true,
  imports: [DatePipe, TitleCasePipe, TranslocoPipe],
  templateUrl: './study-roadmap.component.html',
})
export class StudyRoadmapComponent implements OnInit {
  private roadmapService = inject(RoadmapService);

  roadmap = signal<StudyRoadmap | null>(null);
  loading = signal(true);
  generating = signal(false);
  error = signal<string | null>(null);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.roadmapService.getRoadmap().subscribe({
      next: (r) => {
        this.roadmap.set(r);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.generate();
      },
    });
  }

  generate() {
    this.generating.set(true);
    this.error.set(null);
    this.roadmapService.generateRoadmap().subscribe({
      next: (r) => {
        this.roadmap.set(r);
        this.generating.set(false);
      },
      error: (err) => {
        this.generating.set(false);
        this.error.set('roadmap.failed');
      },
    });
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'low': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'document': return 'roadmap.iconDocument';
      case 'quiz': return 'roadmap.iconQuiz';
      case 'flashcard': return 'roadmap.iconFlashcard';
      case 'review': return 'roadmap.iconReview';
      case 'practice': return 'roadmap.iconPractice';
      default: return 'roadmap.iconDefault';
    }
  }
}
