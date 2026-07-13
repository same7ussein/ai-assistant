import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Flashcard } from '../models/interfaces';

export interface DueCount {
  dueCount: number;
  reviewedToday: number;
  streak: number;
}

export interface FlashcardStats {
  totalCards: number;
  dueToday: number;
  reviewedThisWeek: number;
  avgQuality: number | null;
  totalReviews: number;
  dailyReviews: { date: string; count: number }[];
}

export interface StudySession {
  _id: string;
  user: string;
  startedAt: string;
  endedAt: string | null;
  cardsReviewed: number;
  avgQuality: number | null;
  cards: { card: string; quality: number }[];
}

@Injectable({ providedIn: 'root' })
export class StudySessionService {
  private http = inject(HttpClient);
  private api = environment.apiUrl + '/flashcards';
  private sessionApi = environment.apiUrl + '/study-sessions';

  getDueCards(limit?: number): Observable<Flashcard[]> {
    const params: any = {};
    if (limit) params.limit = limit;
    return this.http.get<Flashcard[]>(`${this.api}/due`, { params });
  }

  getDueCount(): Observable<DueCount> {
    return this.http.get<DueCount>(`${this.api}/due/count`);
  }

  getStats(): Observable<FlashcardStats> {
    return this.http.get<FlashcardStats>(`${this.api}/stats`);
  }

  reviewCard(id: string, quality: number): Observable<Flashcard> {
    return this.http.patch<Flashcard>(`${this.api}/${id}/review`, { quality });
  }

  startSession(): Observable<StudySession> {
    return this.http.post<StudySession>(`${this.sessionApi}/start`, {});
  }

  reviewInSession(sessionId: string, cardId: string, quality: number): Observable<any> {
    return this.http.post(`${this.sessionApi}/review`, { sessionId, cardId, quality });
  }

  endSession(id: string): Observable<StudySession> {
    return this.http.patch<StudySession>(`${this.sessionApi}/${id}/end`, {});
  }

  getSessionHistory(): Observable<StudySession[]> {
    return this.http.get<StudySession[]>(this.sessionApi);
  }
}
