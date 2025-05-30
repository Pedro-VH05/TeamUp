import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { finalize } from 'rxjs/operators';

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
  selectedFile: File | null = null;
  uploadPercent: number | undefined;

  // Formulario paso 1 (Datos básicos)
  basicForm: FormGroup;

  // Formulario paso 2 (Datos deportivos y categorías)
  sportsForm: FormGroup;

  // Opciones para selects
  provinces = [
    'Álava', 'Albacete', 'Alicante', 'Almería', 'Asturias', 'Ávila', 'Badajoz',
    'Barcelona', 'Burgos', 'Cáceres', 'Cádiz', 'Cantabria', 'Castellón', 'Ciudad Real',
    'Córdoba', 'Cuenca', 'Gerona', 'Granada', 'Guadalajara', 'Guipúzcoa', 'Huelva',
    'Huesca', 'Islas Baleares', 'Jaén', 'La Coruña', 'La Rioja', 'Las Palmas', 'León',
    'Lérida', 'Lugo', 'Madrid', 'Málaga', 'Murcia', 'Navarra', 'Orense', 'Palencia',
    'Pontevedra', 'Salamanca', 'Segovia', 'Sevilla', 'Soria', 'Tarragona',
    'Santa Cruz de Tenerife', 'Teruel', 'Toledo', 'Valencia', 'Valladolid',
    'Vizcaya', 'Zamora', 'Zaragoza'
  ];

  sports = ['Fútbol', 'Baloncesto', 'Voleibol', 'Tenis', 'Pádel'];

  ageCategories = [
    'Prebenjamín (6-8 años)',
    'Benjamín (8-10 años)',
    'Alevín (10-12 años)',
    'Infantil (12-14 años)',
    'Cadete (14-16 años)',
    'Juvenil (16-18 años)',
    'Senior (+18 años)',
    'Veterano (+35 años)'
  ];

  genderCategories = ['Masculino', 'Femenino', 'Mixto'];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private storage: Storage
  ) {
    // Paso 1: Datos básicos del club
    this.basicForm = this.fb.group({
      teamName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      province: ['', Validators.required],
      city: ['', Validators.required],
      address: ['', Validators.required]
    }, { validator: this.passwordMatchValidator });

    // Paso 2: Datos deportivos y categorías
    this.sportsForm = this.fb.group({
      sport: ['', Validators.required],
      teamLogo: [null],
      categories: this.fb.array([])
    });

    // Añadir una categoría por defecto
    this.addCategory();
  }

  passwordMatchValidator(form: FormGroup) {
    return form.get('password')?.value === form.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  get categories() {
    return this.sportsForm.get('categories') as any;
  }

  addCategory() {
    const categoryGroup = this.fb.group({
      ageCategory: ['', Validators.required],
      gender: ['', Validators.required],
      teamName: ['']
    });
    this.categories.push(categoryGroup);
  }

  removeCategory(index: number) {
    this.categories.removeAt(index);
  }

  nextStep() {
    if (this.currentStep === 1 && this.basicForm.valid) {
      this.currentStep++;
    } else if (this.currentStep === 2 && this.sportsForm.valid) {
      this.registerTeam();
    }
  }

  prevStep() {
    this.currentStep--;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  async registerTeam() {
    if (this.basicForm.invalid || this.sportsForm.invalid) return;

    const basicData = this.basicForm.value;
    const sportsData = this.sportsForm.value;

    try {
      // 1. Registrar al usuario (y autenticarlo)
      await this.authService.registerTeam(basicData.email, basicData.password);

      // 2. Subir logo si hay
      let downloadURL: string | null = null;
      if (this.selectedFile) {
        const filePath = `profile_pictures/${new Date().getTime()}_${this.selectedFile.name}`;
        const fileRef = ref(this.storage, filePath);
        await uploadBytes(fileRef, this.selectedFile);
        downloadURL = await getDownloadURL(fileRef);
      }

      // 3. Guardar los datos del equipo (Firestore)
      const teamData = {
        ...basicData,
        ...sportsData,
        teamLogo: downloadURL,
        registrationDate: new Date().toISOString()
      };
      await this.authService.saveTeamData(teamData);

      this.router.navigate(['/feed']);
    } catch (error) {
      console.error('Error durante el registro del equipo:', error);
    }
  }

}
