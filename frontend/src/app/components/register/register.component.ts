import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslocoPipe],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private transloco = inject(TranslocoService);
  private _name = signal('');
  private _email = signal('');
  private _password = signal('');
  error = signal('');
  loading = signal(false);
  get name() {
    return this._name();
  }
  set name(v: string) {
    this._name.set(v);
  }
  get email() {
    return this._email();
  }
  set email(v: string) {
    this._email.set(v);
  }
  get password() {
    return this._password();
  }
  set password(v: string) {
    this._password.set(v);
  }
  onSubmit() {
    this.loading.set(true);
    this.error.set('');
    this.auth.register({ name: this.name, email: this.email, password: this.password }).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (e) => {
        this.error.set(e.error?.message || this.transloco.translate('register.failed'));
        this.loading.set(false);
      },
    });
  }
}
