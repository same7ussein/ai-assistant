import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  isDark = signal(false);

  constructor() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      this.enableDark();
    }
  }

  toggle() {
    if (this.isDark()) {
      this.disableDark();
    } else {
      this.enableDark();
    }
  }

  private enableDark() {
    document.documentElement.classList.add('dark');
    this.isDark.set(true);
    localStorage.setItem('theme', 'dark');
  }

  private disableDark() {
    document.documentElement.classList.remove('dark');
    this.isDark.set(false);
    localStorage.setItem('theme', 'light');
  }
}
