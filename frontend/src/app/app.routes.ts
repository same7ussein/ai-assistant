import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./components/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./components/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: 'documents',
    loadComponent: () =>
      import('./components/pdf-upload/pdf-upload.component').then((m) => m.PdfUploadComponent),
    canActivate: [authGuard],
  },
  {
    path: 'documents/:id',
    loadComponent: () =>
      import('./components/pdf-viewer/pdf-viewer.component').then((m) => m.PdfViewerComponent),
    canActivate: [authGuard],
  },
  {
    path: 'documents/:id/flashcards',
    loadComponent: () =>
      import('./components/my-flashcards/my-flashcards.component').then(
        (m) => m.MyFlashcardsComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'documents/:id/quiz',
    loadComponent: () =>
      import('./components/quiz-generator/quiz-generator.component').then(
        (m) => m.QuizGeneratorComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'exams',
    loadComponent: () =>
      import('./components/exam-generator/exam-generator.component').then(
        (m) => m.ExamGeneratorComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'flashcards',
    loadComponent: () =>
      import('./components/all-flashcards/all-flashcards.component').then(
        (m) => m.AllFlashcardsComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'study-roadmap',
    loadComponent: () =>
      import('./components/study-roadmap/study-roadmap.component').then(
        (m) => m.StudyRoadmapComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'study-plan',
    loadComponent: () =>
      import('./components/study-plan/study-plan.component').then((m) => m.StudyPlanComponent),
    canActivate: [authGuard],
  },
  {
    path: 'activities',
    loadComponent: () =>
      import('./components/activities/activities.component').then((m) => m.ActivitiesComponent),
    canActivate: [authGuard],
  },
  {
    path: 'study-session',
    loadComponent: () =>
      import('./components/study-session/study-session.component').then(
        (m) => m.StudySessionComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'analytics',
    loadComponent: () =>
      import('./components/analytics/analytics.component').then((m) => m.AnalyticsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./components/profile/profile.component').then((m) => m.ProfileComponent),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: '/dashboard' },
];
