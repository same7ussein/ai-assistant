import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { WeeklyStudyPlan } from '../models/interfaces';

@Injectable({ providedIn: 'root' })
export class StudyPlanService {
  private http = inject(HttpClient);
  private api = environment.apiUrl + '/study-plan';

  getCurrentPlan(): Observable<WeeklyStudyPlan | null> {
    return this.http.get<WeeklyStudyPlan | null>(`${this.api}/current`);
  }

  generatePlan(): Observable<WeeklyStudyPlan> {
    return this.http.post<WeeklyStudyPlan>(`${this.api}/generate`, {});
  }

  updateTask(taskId: string, changes: { completed?: boolean; skipped?: boolean }): Observable<WeeklyStudyPlan> {
    return this.http.patch<WeeklyStudyPlan>(`${this.api}/tasks/${taskId}`, changes);
  }

  getHistory(): Observable<WeeklyStudyPlan[]> {
    return this.http.get<WeeklyStudyPlan[]>(`${this.api}/history`);
  }
}
