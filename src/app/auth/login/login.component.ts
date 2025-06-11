import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule]
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage = '';

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
    this.errorMessage = '';

    try {
      await this.authService.login(email, password);
      this.router.navigate(['/feed']);
    } catch (error: any) {
      this.errorMessage = this.getAuthErrorMessage(error);
    }
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  private getAuthErrorMessage(error: any): string {
    switch (error.code || error.message) {
      case 'auth/user-not-found':
        return 'Usuario no registrado';
      case 'auth/wrong-password':
        return 'Contraseña incorrecta';
      case 'No se encontraron datos de usuario':
        return 'Cuenta incompleta, por favor contacta con soporte';
      default:
        return 'Error al iniciar sesión: ' + (error.message || 'Inténtalo de nuevo');
    }
  }
}
