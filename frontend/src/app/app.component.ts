import { Component, inject, computed, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  template: `
    @if (auth.isAuthenticated()) {
      <div class="flex h-screen overflow-hidden bg-white dark:bg-gray-900">

        <!-- Desktop sidebar -->
        <div class="hidden lg:flex flex-shrink-0">
          <app-navbar />
        </div>

        <!-- Mobile backdrop -->
        @if (sidebarOpen()) {
          <div class="fixed inset-0 bg-black/40 z-40 lg:hidden" (click)="sidebarOpen.set(false)"></div>
        }

        <!-- Mobile drawer -->
        @if (sidebarOpen()) {
          <div class="fixed top-0 left-0 z-50 h-full shadow-xl lg:hidden">
            <app-navbar />
          </div>
        }

        <!-- Main area -->
        <div class="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">

          <!-- Top Header -->
          <header class="h-16 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
            <div class="flex items-center gap-2">
              <button class="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" (click)="sidebarOpen.set(true)">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="22" height="22">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
            <div class="flex items-center gap-4">

              <!-- Theme toggle -->
              <button class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" (click)="theme.toggle()" title="Toggle theme">
                @if (theme.isDark()) {
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                } @else {
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                }
              </button>

              <!-- User info -->
              <div class="flex items-center gap-2.5">
                <div class="text-right hidden sm:block">
                  <p class="text-sm font-semibold text-gray-900 dark:text-gray-100 m-0 leading-tight">{{ auth.user()?.name }}</p>
                  <p class="text-xs text-gray-400 m-0 leading-tight">{{ auth.user()?.email }}</p>
                </div>
                <div class="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {{ userInitials() }}
                </div>
              </div>

            </div>
          </header>

          <!-- Page Content -->
          <main class="flex-1 overflow-y-auto bg-[#f5f5fa] dark:bg-gray-900">
            <router-outlet />
          </main>

        </div>
      </div>
    } @else {
      <router-outlet />
    }
  `,
  styles: [`
    :host { display: block; height: 100vh; overflow: hidden; }
  `],
})
export class AppComponent {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  sidebarOpen = signal(false);

  userInitials = computed(() => {
    const name = this.auth.user()?.name ?? '';
    return name
      .split(' ')
      .map((n: string) => n[0] ?? '')
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  });
}
