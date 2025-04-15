import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register-team',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './register-team.component.html',
  styleUrls: ['./register-team.component.scss']
})
export class RegisterTeamComponent {
  currentStep = 1;
  totalSteps = 2;

  // Formulario paso 1 (Datos básicos)
  basicForm: FormGroup;

  // Formulario paso 2 (Datos deportivos)
  sportsForm: FormGroup;

  // Opciones para selects
  sports = ['Fútbol', 'Baloncesto', 'Voleibol', 'Tenis', 'Pádel'];
  positions = {
    'Fútbol': ['Portero', 'Defensa', 'Centrocampista', 'Delantero'],
    'Baloncesto': ['Base', 'Escolta', 'Alero', 'Ala-pívot', 'Pívot'],
    'Voleibol': ['Colocador', 'Receptor', 'Central', 'Opuesto', 'Libero'],
    'Tenis': ['Individual', 'Dobles'],
    'Pádel': ['Drive', 'Reves']
  };

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    // Paso 1: Datos básicos
    this.basicForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      birthDate: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    // Paso 2: Datos deportivos
    this.sportsForm = this.fb.group({
      sport: ['', Validators.required],
      position: ['', Validators.required],
      experienceYears: ['', [Validators.required, Validators.min(0)]],
      lookingForTeam: [false],
      profilePicture: [null]
    });
  }

  passwordMatchValidator(form: FormGroup) {
    return form.get('password')?.value === form.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.sportsForm.patchValue({ profilePicture: file });
    }
  }

  nextStep() {
    if (this.currentStep === 1 && this.basicForm.valid) {
      this.currentStep++;
    } else if (this.currentStep === 2 && this.sportsForm.valid) {
      this.registerPlayer();
    }
  }

  prevStep() {
    this.currentStep--;
  }

  async registerPlayer() {
    if (this.basicForm.invalid || this.sportsForm.invalid) return;

    const basicData = this.basicForm.value;
    const sportsData = this.sportsForm.value;

    try {
      await this.authService.registerPlayer(
        basicData,
        sportsData,
        basicData.password
      );
      this.router.navigate(['/feed']);
    } catch (error) {
      console.error('Error en el registro:', error);
    }
  }

  get currentPositions(): string[] {
    const sport = this.sportsForm.get('sport')?.value;
    return this.positions[sport as keyof typeof this.positions] || [];
  }

}
