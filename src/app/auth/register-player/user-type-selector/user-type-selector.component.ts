import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-user-type-selector',
  templateUrl: './user-type-selector.component.html',
  styleUrls: ['./user-type-selector.component.scss']
})
export class UserTypeSelectorComponent {
  googleUser: any;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    // Obtener datos del usuario de Google del estado de navegación
    const navigation = this.router.getCurrentNavigation();
    this.googleUser = navigation?.extras?.state?.['googleUser'];

    if (!this.googleUser) {
      this.router.navigate(['/login']);
    }
  }

  async selectType(type: 'player' | 'team') {
    // Actualizar el tipo de usuario en Firestore
    if (this.googleUser?.uid) {
      await this.authService['updateUserType'](this.googleUser.uid, type);

      // Redirigir al formulario de registro correspondiente
      this.router.navigate([`/register/${type}`], {
        state: { googleUser: this.googleUser }
      });
    }
  }
}
