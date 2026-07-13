import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { GenQuestion } from '../models/interfaces';

export interface QuizGenerateResponse {
  _id: string;
  questions: GenQuestion[];
  title: string;
  difficulty: string;
}

export interface DocumentQuiz {
  _id: string;
  document: string;
  title: string;
  questions: GenQuestion[];
  difficulty: string;
  result: { score: number; answers: number[] } | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class QuizGenService {
  private http = inject(HttpClient);
  private api = environment.apiUrl + '/quiz-gen';
  private docQuizApi = environment.apiUrl + '/document-quizzes';

  generate(
    documentId: string,
    count: number,
    difficulty: string,
  ): Observable<QuizGenerateResponse> {
    return this.http.post<QuizGenerateResponse>(
      `${this.api}/generate`,
      { documentId, count, difficulty },
    );
  }

  list(documentId?: string): Observable<DocumentQuiz[]> {
    let p = new HttpParams();
    if (documentId) p = p.set('document', documentId);
    return this.http.get<DocumentQuiz[]>(this.docQuizApi, { params: p });
  }

  create(documentId: string, title: string, questions: GenQuestion[], difficulty: string): Observable<DocumentQuiz> {
    return this.http.post<DocumentQuiz>(this.docQuizApi, { documentId, title, questions, difficulty });
  }

  saveResult(id: string, answers: number[]): Observable<DocumentQuiz> {
    return this.http.patch<DocumentQuiz>(`${this.docQuizApi}/${id}/result`, { answers });
  }

  clearResult(id: string): Observable<DocumentQuiz> {
    return this.http.delete<DocumentQuiz>(`${this.docQuizApi}/${id}/result`);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.docQuizApi}/${id}`);
  }
}
