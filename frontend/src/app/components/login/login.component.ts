import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslocoPipe],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private transloco = inject(TranslocoService);

  private _email = signal('');
  private _password = signal('');
  error = signal('');
  loading = signal(false);

  get email() { return this._email(); }
  set email(v: string) { this._email.set(v); }
  get password() { return this._password(); }
  set password(v: string) { this._password.set(v); }

  onSubmit() {
    this.loading.set(true);
    this.error.set('');
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (e) => {
        this.error.set(e.error?.message || this.transloco.translate('login.failed'));
        this.loading.set(false);
      },
    });
  }
}
