import { Component, OnInit, inject } from '@angular/core';
import { Observable, firstValueFrom, take, switchMap, of, BehaviorSubject } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { Firestore, collection, addDoc, collectionData, query, where, orderBy } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.scss']
})
export class FeedComponent implements OnInit {
  private firestore = inject(Firestore);
  private storage = inject(Storage);

  currentUser$: Observable<any>;
  posts$ = new BehaviorSubject<any[]>([]);
  newPostText = '';
  selectedFile: File | null = null;
  selectedFilePreview: string | null = null;
  isLoadingPosts = false;
  isCreatingPost = false;

  constructor(private authService: AuthService) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    this.loadPosts();
  }

  async loadPosts() {
    this.isLoadingPosts = true;
    try {
      const user = await firstValueFrom(this.currentUser$.pipe(take(1)));
      if (!user?.sport) {
        this.posts$.next([]);
        return;
      }

      const postsRef = collection(this.firestore, 'posts');
      const q = query(
        postsRef,
        where('sport', '==', user.sport),
        orderBy('createdAt', 'desc')
      );

      const postsArray = await firstValueFrom(collectionData(q, { idField: 'id' }));

      this.posts$.next(postsArray);
    } catch (error) {
      console.error('Error loading posts:', error);
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

  async createPost(): Promise<void> {
    if (this.isCreatingPost) return;

    this.isCreatingPost = true;
    try {
      const user = await firstValueFrom(this.currentUser$.pipe(take(1)));

      if (!user) throw new Error('Usuario no autenticado');
      if (!user.sport) throw new Error('No tienes deporte asignado');
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
        authorId: user.uid,
        authorName: user.firstName + ' ' + user.lastName || user.teamName || 'Usuario Anónimo',
        authorPhoto: user.photoURL || user.teamLogoUrl || 'assets/user-profile.jpg',
        authorType: user.type || 'player',
        sport: user.sport
      };

      const postsRef = collection(this.firestore, 'posts');
      await addDoc(postsRef, postData);

      // Recargar posts después de crear uno nuevo
      this.loadPosts();

      // Resetear formulario
      this.newPostText = '';
      this.selectedFile = null;
      this.selectedFilePreview = null;
    } catch (error) {
      console.error('Error al crear el post:', error);
    } finally {
      this.isCreatingPost = false;
    }
  }
}
