import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Activity } from '../../models/interfaces';
import { ActivityService } from '../../services/activity.service';

@Component({
  selector: 'app-activities',
  standalone: true,
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './activities.component.html',
})
export class ActivitiesComponent implements OnInit {
  private activityService = inject(ActivityService);

  activities = signal<Activity[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.activityService.listAll().subscribe({
      next: (activities) => {
        this.activities.set(activities);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
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
