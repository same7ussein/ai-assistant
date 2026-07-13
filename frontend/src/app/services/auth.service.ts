import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, User } from '../models/interfaces';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private api = environment.apiUrl + '/auth';

  user = signal<User | null>(null);
  token = signal<string | null>(null);

  constructor() {
    const saved = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (saved) this.token.set(saved);
    if (savedUser) this.user.set(JSON.parse(savedUser));
  }

  register(data: { name: string; email: string; password: string }): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.api}/register`, data)
      .pipe(tap((r) => this.setSession(r)));
  }

  login(data: { email: string; password: string }): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.api}/login`, data)
      .pipe(tap((r) => this.setSession(r)));
  }

  getMe(): Observable<User> {
    return this.http.get<User>(`${this.api}/me`);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.token.set(null);
    this.user.set(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return !!this.token();
  }

  private setSession(r: AuthResponse) {
    localStorage.setItem('token', r.token);
    localStorage.setItem('user', JSON.stringify(r.user));
    this.token.set(r.token);
    this.user.set(r.user);
  }
}
