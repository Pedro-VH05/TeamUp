import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  imports: [ReactiveFormsModule],
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  registerForm: FormGroup;
  userType: 'player' | 'team' = 'player';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      confirmPassword: ['', Validators.required]
    });
  }

  async register() {
    const { name, email, password, confirmPassword } = this.registerForm.value;

    if (this.registerForm.invalid || password !== confirmPassword) {
      console.error('Formulario inválido o contraseñas no coinciden');
      return;
    }

    try {
      if (this.userType === 'player') {
        await this.authService.registerPlayer({ name, email }, password);
      } else {
        await this.authService.registerTeam({ name, email }, password);
      }

      this.router.navigate(['/landing']);
    } catch (error) {
      console.error('Error al registrarse', error);
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
