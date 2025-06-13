import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Storage, getStorage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-register-player',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './register-player.component.html',
  styleUrls: ['./register-player.component.scss']
})
export class RegisterPlayerComponent {
  currentStep = 1;
  totalSteps = 2;
  selectedFile: File | null = null;

  // Formulario paso 1 (Datos básicos)
  basicForm: FormGroup;

  // Formulario paso 2 (Datos deportivos)
  sportsForm: FormGroup;

  // Opciones para selects
  sports = [
    'Fútbol',
    'Baloncesto',
    'Voleibol',
    'Fútbol Americano',
    'Hockey sobre hielo',
    'Rugby',
    'Hockey sobre hierba',
    'Críquet',
    'Béisbol',
    'Rugby League',
    'Lacrosse',
    'Balonmano',
    'Fútbol sala',
    'Fútbol australiano',
    'Waterpolo'
  ];

  positions = {
    'Fútbol': [
      'Portero',
      'Lateral derecho',
      'Lateral izquierdo',
      'Central',
      'Líbero',
      'Pivote defensivo',
      'Interior derecho',
      'Interior izquierdo',
      'Mediocentro organizador',
      'Mediapunta',
      'Extremo derecho',
      'Extremo izquierdo',
      'Delantero centro',
      'Segundo delantero'
    ],
    'Baloncesto': [
      'Base',
      'Escolta',
      'Alero',
      'Ala-pívot',
      'Pívot'
    ],
    'Voleibol': [
      'Colocador',
      'Receptor atacante',
      'Central',
      'Opuesto',
      'Líbero'
    ],
    'Fútbol Americano': [
      'Quarterback',
      'Running back',
      'Fullback',
      'Wide receiver',
      'Tight end',
      'Tackle',
      'Guard',
      'Center',
      'Defensive tackle',
      'Defensive end',
      'Linebacker',
      'Cornerback',
      'Safety',
      'Kicker',
      'Punter',
      'Long snapper',
      'Returner'
    ],
    'Hockey sobre hielo': [
      'Portero',
      'Defensa izquierdo',
      'Defensa derecho',
      'Center',
      'Ala izquierda',
      'Ala derecha'
    ],
    'Rugby': [
      'Pilar izquierdo',
      'Pilar derecho',
      'Hooker',
      'Segunda línea',
      'Flanker',
      'Número 8',
      'Medio de melé',
      'Apertura',
      'Centro',
      'Ala',
      'Zaguero'
    ],
    'Hockey sobre hierba': [
      'Portero',
      'Lateral',
      'Central defensivo',
      'Interior',
      'Medio centro',
      'Extremo',
      'Centro delantero'
    ],
    'Críquet': [
      'Bateador',
      'Lanzador',
      'Wicket-keeper',
      'Fielder',
      'All-rounder'
    ],
    'Béisbol': [
      'Lanzador',
      'Receptor',
      'Primera base',
      'Segunda base',
      'Tercera base',
      'Campocorto',
      'Jardinero izquierdo',
      'Jardinero central',
      'Jardinero derecho',
      'Bateador designado'
    ],
    'Rugby League': [
      'Prop',
      'Hooker',
      'Second row',
      'Lock',
      'Halfback',
      'Five-eighth',
      'Wing',
      'Center',
      'Fullback'
    ],
    'Lacrosse': [
      'Portero',
      'Defensa',
      'Mediocampista',
      'Atacante',
      'Long stick midfielder',
      'Faceoff specialist'
    ],
    'Balonmano': [
      'Portero',
      'Extremo derecho',
      'Extremo izquierdo',
      'Lateral derecho',
      'Lateral izquierdo',
      'Central',
      'Pivote'
    ],
    'Fútbol sala': [
      'Portero',
      'Cierre',
      'Ala derecha',
      'Ala izquierda',
      'Pívot',
      'Universal'
    ],
    'Fútbol australiano': [
      'Full forward',
      'Centre half-forward',
      'Centre',
      'Rover',
      'Ruckman',
      'Back pocket',
      'Half-back flank',
      'Wingman'
    ],
    'Waterpolo': [
      'Portero',
      'Boya',
      'Boya defensivo',
      'Perimetral derecho',
      'Perimetral izquierdo',
      'Exterior',
      'Universal'
    ]
  };


  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private storage: Storage,
    private userService: UserService
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

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file; // Actualizado para usar selectedFile
    }
  }

  async registerPlayer() {
  if (this.basicForm.invalid || this.sportsForm.invalid) return;

  const { password, confirmPassword, ...basicData } = this.basicForm.value;
  const sportsData = this.sportsForm.value;

  try {
    const userCredential = await this.authService.registerTeam(
      basicData.email,
      password
    );
    const userId = userCredential.user.uid;

    const playerData = {
      ...basicData,
      ...sportsData,
      profilePicture: this.selectedFile || null,
      type: 'player',
      registrationDate: new Date().toISOString()
    };

    await this.userService.createUser(userId, playerData);
    this.router.navigate(['/feed']);
  } catch (error) {
    console.error('Error en registro:', error);
  }
}

  get currentPositions(): string[] {
    const sport = this.sportsForm.get('sport')?.value;
    return this.positions[sport as keyof typeof this.positions] || [];
  }

}
