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
  isModalOpen = true; // Controla la visibilidad del modal

  async ngOnInit() {
    try {
      // Espera a que la autenticación se inicialice
      this.currentUser = await this.authService.getCurrentUser();

      if (!this.currentUser) {
        this.router.navigate(['/login'], {
          queryParams: { returnUrl: this.router.url }
        });
        return;
      }

      const { id } = this.route.snapshot.params;
      const docRef = doc(this.firestore, 'users', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        this.profile = {
          ...docSnap.data(),
          id: docSnap.id,
          uid: docSnap.id
        };
      } else {
        this.error = 'Perfil no encontrado';
      }
    } catch (err) {
      console.error('Error en profile component:', err);
      this.error = 'Error al cargar el perfil';
    } finally {
      this.isLoading = false;
    }
  }

  closeModal(): void {
    this.isModalOpen = false;
    // Opcional: navegar a una ruta diferente o cerrar completamente
    this.router.navigate(['..'], { relativeTo: this.route });
  }

  navigateToMessages(userId: string): void {
    this.router.navigate(['/messages'], { queryParams: { recipient: userId } });
  }

  get isTeam(): boolean {
    return this.profile?.type === 'team';
  }
}
