import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  imports: [ReactiveFormsModule],
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;

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

  goToRegister() {
    this.router.navigate(['/register']);
  }
}
