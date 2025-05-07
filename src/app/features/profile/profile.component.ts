import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { AuthService } from '../../core/services/auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  private firestore = inject(Firestore);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  profile: any = null;
  isLoading = true;
  error: string | null = null;
  currentUser: any;

  async ngOnInit() {
    try {
      // Verifica autenticación primero
      const user = await firstValueFrom(this.authService.currentUser$);
      console.log(user);
      if (!user) {
        console.log('No hay usuario autenticado, redirigiendo...');
        this.router.navigate(['/login'], {
          queryParams: { returnUrl: this.router.url }
        });
        return;
      }

      this.currentUser = user;
      console.log('Usuario autenticado:', user.uid); // Depuración

      const { id } = this.route.snapshot.params;
      console.log('ID de perfil solicitado:', id); // Depuración

      const docRef = doc(this.firestore, 'users', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        console.log('Perfil encontrado:', docSnap.id); // Depuración
        this.profile = {
          ...docSnap.data(),
          id: docSnap.id,
          uid: docSnap.id
        };
      } else {
        console.log('Perfil no existe'); // Depuración
        this.error = 'Perfil no encontrado';
      }
    } catch (err) {
      console.error('Error en profile component:', err); // Depuración
      this.error = 'Error al cargar el perfil';
    } finally {
      this.isLoading = false;
    }
  }

  navigateToMessages(userId: string): void {
    this.router.navigate(['/messages'], { queryParams: { recipient: userId } });
  }

  // Helper para determinar si es equipo
  get isTeam(): boolean {
    return this.profile?.type === 'team';
  }
}
