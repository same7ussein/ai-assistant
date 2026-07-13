import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ExamQuestion {
  type: 'multiple-choice' | 'true-false' | 'short-answer';
  question: string;
  options: string[];
  correctAnswer?: number | string;
  explanation?: string;
}

export interface ExamGenerateResponse {
  _id: string;
  questions: ExamQuestion[];
  title: string;
  difficulty: string;
  documentIds: string[];
}

export interface Exam {
  _id: string;
  documents: string[];
  title: string;
  questions: ExamQuestion[];
  difficulty: string;
  result: { score: number; answers: (number | string)[] } | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ExamService {
  private http = inject(HttpClient);
  private genApi = environment.apiUrl + '/exam-gen';
  private examApi = environment.apiUrl + '/exams';

  generate(
    documentIds: string[],
    count: number,
    difficulty: string,
  ): Observable<ExamGenerateResponse> {
    return this.http.post<ExamGenerateResponse>(
      `${this.genApi}/generate`,
      { documentIds, count, difficulty },
    );
  }

  list(): Observable<Exam[]> {
    return this.http.get<Exam[]>(this.examApi);
  }

  create(documentIds: string[], title: string, questions: ExamQuestion[], difficulty: string): Observable<Exam> {
    return this.http.post<Exam>(this.examApi, { documentIds, title, questions, difficulty });
  }

  saveResult(id: string, answers: (number | string)[]): Observable<Exam> {
    return this.http.patch<Exam>(`${this.examApi}/${id}/result`, { answers });
  }

  clearResult(id: string): Observable<Exam> {
    return this.http.delete<Exam>(`${this.examApi}/${id}/result`);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.examApi}/${id}`);
  }
}
