// feed.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { Observable, firstValueFrom, take, switchMap, of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { Firestore, collection, addDoc, collectionData, query, where } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './feed.component.html',
  styleUrl: './feed.component.scss'
})
export class FeedComponent implements OnInit {
  private firestore: Firestore = inject(Firestore);
  private storage: Storage = inject(Storage);

  currentUser$!: Observable<any>;
  posts$!: Observable<any[]>;
  newPostText = '';
  selectedFile: File | null = null;
  selectedFilePreview: string | null = null;
  isLoading = false;
  isCreatingPost: boolean = false;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.currentUser$ = this.authService.currentUser$;

    this.posts$ = this.currentUser$.pipe(
      switchMap(user => {
        if (!user?.sport) return of([]);

        const postsRef = collection(this.firestore, 'posts');
        const q = query(postsRef, where('sport', '==', user.sport));
        return collectionData(q, { idField: 'id' });
      })
    );
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
    this.isLoading = true;
    try {
      const user = await firstValueFrom(this.currentUser$.pipe(take(1)));

      if (!user) throw new Error('Usuario no autenticado');
      if (!this.newPostText.trim()) throw new Error('El texto no puede estar vacío');

      let imageUrl = '';

      if (this.selectedFile) {
        const storageRef = ref(this.storage, `posts/${Date.now()}_${this.selectedFile.name}`);
        const snapshot = await uploadBytes(storageRef, this.selectedFile);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      // Asegurar que authorPhoto tenga un valor por defecto si es undefined
      const authorPhoto = user.photoURL || 'assets/default-profile.png';

      const postData = {
        text: this.newPostText,
        imageUrl,
        createdAt: new Date().toISOString(),
        authorId: user.uid,
        authorName: user.name || 'Usuario Anónimo',
        authorPhoto: authorPhoto,
        sport: user.sport
      };

      const postsRef = collection(this.firestore, 'posts');
      await addDoc(postsRef, postData);

      this.newPostText = '';
      this.selectedFile = null;
      this.selectedFilePreview = null;
    } catch (error) {
      console.error('Error al crear el post:', error);
    } finally {
      this.isLoading = false;
    }
  }
}
