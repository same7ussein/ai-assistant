import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Activity } from '../models/interfaces';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private http = inject(HttpClient);
  private api = environment.apiUrl + '/activities';

  list(limit = 20): Observable<Activity[]> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<Activity[]>(this.api, { params });
  }

  listAll(): Observable<Activity[]> {
    const params = new HttpParams().set('all', 'true');
    return this.http.get<Activity[]>(this.api, { params });
  }
}
