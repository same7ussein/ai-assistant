import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { StudyRoadmap } from '../models/interfaces';

@Injectable({ providedIn: 'root' })
export class RoadmapService {
  private http = inject(HttpClient);
  private api = environment.apiUrl + '/study-roadmap';

  getRoadmap(): Observable<StudyRoadmap | null> {
    return this.http.get<StudyRoadmap | null>(this.api);
  }

  generateRoadmap(): Observable<StudyRoadmap> {
    return this.http.post<StudyRoadmap>(`${this.api}/generate`, {});
  }
}
