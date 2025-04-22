import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Subscription, firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { Firestore, collection, addDoc, collectionData, query, where, orderBy } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { Router } from '@angular/router';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.scss']
})
export class FeedComponent implements OnInit, OnDestroy {
  private firestore = inject(Firestore);
  private storage = inject(Storage);
  private authService = inject(AuthService);
  private router = inject(Router);
  private userSub: Subscription = new Subscription;

  posts$ = new BehaviorSubject<any[]>([]);
  currentUser: any = null;
  newPostText = '';
  selectedFile: File | null = null;
  selectedFilePreview: string | null = null;
  isLoadingPosts = false;
  isCreatingPost = false;
  errorMessage: string | null = null;

  async ngOnInit(): Promise<void> {
    this.userSub = this.authService.currentUser$.subscribe({
      next: async (user) => {
        if (!user) {
          this.router.navigate(['/login']);
          return;
        }

        this.currentUser = user;
        console.log('Usuario autenticado:', user);
        await this.loadPosts();
      },
      error: (err) => {
        console.error('Error en suscripción a usuario:', err);
        this.router.navigate(['/login']);
      }
    });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  async loadPosts() {
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    this.isLoadingPosts = true;
    this.errorMessage = null;

    try {
      const sport = this.currentUser.sport;
      if (!sport) {
        this.errorMessage = 'No tienes un deporte asignado';
        this.posts$.next([]);
        return;
      }

      const postsRef = collection(this.firestore, 'posts');
      const q = query(
        postsRef,
        where('sport', '==', sport),
        orderBy('createdAt', 'desc')
      );

      const posts = await firstValueFrom(collectionData(q, { idField: 'id' }));
      this.posts$.next(posts as any[]);
    } catch (error: any) {
      console.error('Error al cargar posts:', error);
      this.errorMessage = 'Error al cargar publicaciones';

      if (error.code === 'failed-precondition') {
        this.errorMessage = 'Configuración incompleta. Por favor intenta más tarde.';
        console.error('Necesitas crear un índice en Firestore:', error.message);
      }

      this.posts$.next([]);
    } finally {
      this.isLoadingPosts = false;
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.createImagePreview(file);
    }
  }

  createImagePreview(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.selectedFilePreview = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  getDisplayName(user: any): string {
    return user.type === 'team' ? user.teamName : `${user.firstName} ${user.lastName}`;
  }

  getProfileImage(user: any): string {
    return user.type === 'team' ? (user.teamLogoUrl || 'assets/team-default.png') :
                                (user.profilePictureUrl || 'assets/user-profile.jpg');
  }

  async createPost(): Promise<void> {
    if (this.isCreatingPost) return;

    this.isCreatingPost = true;
    try {
      if (!this.currentUser) {
        this.router.navigate(['/login']);
        return;
      }

      if (!this.currentUser.sport) throw new Error('No tienes deporte asignado');
      if (!this.newPostText.trim()) throw new Error('El texto no puede estar vacío');

      let imageUrl = '';

      if (this.selectedFile) {
        const storageRef = ref(this.storage, `posts/${Date.now()}_${this.selectedFile.name}`);
        const snapshot = await uploadBytes(storageRef, this.selectedFile);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      const postData = {
        text: this.newPostText,
        imageUrl: imageUrl || null,
        createdAt: new Date().toISOString(),
        authorId: this.currentUser.uid,
        authorName: this.getDisplayName(this.currentUser),
        authorPhoto: this.getProfileImage(this.currentUser),
        authorType: this.currentUser.type || 'player',
        sport: this.currentUser.sport
      };

      const postsRef = collection(this.firestore, 'posts');
      await addDoc(postsRef, postData);

      await this.loadPosts();

      this.newPostText = '';
      this.selectedFile = null;
      this.selectedFilePreview = null;
    } catch (error) {
      console.error('Error al crear el post:', error);
      this.errorMessage = 'Error al crear la publicación';
    } finally {
      this.isCreatingPost = false;
    }
  }
}
