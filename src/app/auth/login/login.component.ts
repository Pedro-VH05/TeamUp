import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class LoginComponent {
  loginForm: FormGroup;
  googleLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  async login() {
    if (this.loginForm.invalid) return;
    const { email, password } = this.loginForm.value;
    try {
      await this.authService.login(email, password);
      this.router.navigate(['/feed']);
    } catch (error) {
      console.error('Error al iniciar sesión', error);
    }
  }

  async loginWithGoogle() {
  this.googleLoading = true;
  try {
    const result = await this.authService.loginWithGoogle();

    if (result.needsTypeSelection) {
      // Redirigir a selección de tipo de usuario
      this.router.navigate(['/user-type-selector'], {
        state: { googleUser: result.user }
      });
    } else if (result.needsProfileCompletion) {
      // Redirigir a completar perfil según el tipo
      this.router.navigate([`/register/${result.userType}`], {
        state: { googleUser: result.user }
      });
    } else {
      // Perfil completo, redirigir al feed
      this.router.navigate(['/feed']);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    this.googleLoading = false;
  }
}

  goToRegister() {
    this.router.navigate(['/register']);
  }
}
