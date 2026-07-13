import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Flashcard } from '../models/interfaces';

export interface FlashcardBatch {
  _id: string;
  document: string;
  label: string;
  cardIds: string[];
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class FlashcardService {
  private http = inject(HttpClient);
  private api = environment.apiUrl + '/flashcards';
  private batchApi = environment.apiUrl + '/flashcard-batches';

  list(documentId?: string): Observable<Flashcard[]> {
    let p = new HttpParams();
    if (documentId) p = p.set('document', documentId);
    return this.http.get<Flashcard[]>(this.api, { params: p });
  }

  generate(documentId: string, count: number): Observable<{ cards: Flashcard[]; title: string }> {
    return this.http.post<any>(`${this.api}/generate`, { documentId, count });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  markReviewed(id: string): Observable<Flashcard> {
    return this.http.patch<Flashcard>(`${this.api}/${id}/review`, {});
  }

  getReviewed(documentId?: string): Observable<string[]> {
    let p = new HttpParams();
    if (documentId) p = p.set('document', documentId);
    return this.http.get<string[]>(`${this.api}/reviewed`, { params: p });
  }

  listBatches(documentId?: string): Observable<FlashcardBatch[]> {
    let p = new HttpParams();
    if (documentId) p = p.set('document', documentId);
    return this.http.get<FlashcardBatch[]>(this.batchApi, { params: p });
  }

  createBatch(documentId: string, cardIds: string[], label?: string): Observable<FlashcardBatch> {
    return this.http.post<FlashcardBatch>(this.batchApi, { documentId, cardIds, label });
  }

  deleteBatch(id: string): Observable<void> {
    return this.http.delete<void>(`${this.batchApi}/${id}`);
  }
}
