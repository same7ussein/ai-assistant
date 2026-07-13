import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AppDocument } from '../models/interfaces';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private http = inject(HttpClient);
  private api = environment.apiUrl + '/documents';

  list(): Observable<AppDocument[]> {
    return this.http.get<AppDocument[]>(this.api);
  }

  get(id: string): Observable<AppDocument> {
    return this.http.get<AppDocument>(`${this.api}/${id}`);
  }

  upload(file: File, title?: string): Observable<AppDocument> {
    const fd = new FormData();
    fd.append('file', file);
    if (title) fd.append('title', title);
    return this.http.post<AppDocument>(`${this.api}/upload`, fd);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  ask(id: string, question: string): Observable<{ reply: string }> {
    return this.http.post<{ reply: string }>(`${this.api}/${id}/ask`, { question });
  }
}
