import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, TranslocoPipe],
  templateUrl: './profile.component.html',
})
export class ProfileComponent {
  auth = inject(AuthService);
  private http = inject(HttpClient);
  private transloco = inject(TranslocoService);

  currentPw = '';
  newPw = '';
  confirmPw = '';
  saving = signal(false);
  pwError = signal('');
  pwSuccess = signal('');

  changePassword() {
    this.pwError.set('');
    this.pwSuccess.set('');

    if (!this.currentPw || !this.newPw || !this.confirmPw) {
      this.pwError.set(this.transloco.translate('profile.fillFields'));
      return;
    }
    if (this.newPw !== this.confirmPw) {
      this.pwError.set(this.transloco.translate('profile.passwordsMismatch'));
      return;
    }
    if (this.newPw.length < 6) {
      this.pwError.set(this.transloco.translate('profile.passwordMinLength'));
      return;
    }

    this.saving.set(true);
    this.http
      .put(`${environment.apiUrl}/auth/password`, {
        currentPassword: this.currentPw,
        newPassword: this.newPw,
      })
      .subscribe({
        next: () => {
          this.pwSuccess.set(this.transloco.translate('profile.passwordUpdated'));
          this.currentPw = '';
          this.newPw = '';
          this.confirmPw = '';
          this.saving.set(false);
        },
        error: (e) => {
          this.pwError.set(e.error?.message || this.transloco.translate('profile.updateFailed'));
          this.saving.set(false);
        },
      });
  }
}
