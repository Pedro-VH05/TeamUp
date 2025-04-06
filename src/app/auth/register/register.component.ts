import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule]
})
export class RegisterComponent {
  registerForm: FormGroup;
  userType: 'player' | 'team' = 'player';

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      confirmPassword: ['', Validators.required]
    });
  }

  async register() {
    if (this.registerForm.invalid || this.registerForm.value.password !== this.registerForm.value.confirmPassword) {
      console.error('Formulario inválido o contraseñas no coinciden');
      return;
    }

    const { name, email, password } = this.registerForm.value;
    try {
      if (this.userType === 'player') {
        await this.authService.registerPlayer({ name, email }, password);
      } else {
        await this.authService.registerTeam({ name, email }, password);
      }
      console.log('Registro exitoso');
    } catch (error) {
      console.error('Error al registrarse', error);
    }
  }
}
