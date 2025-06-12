import { Component, OnInit, OnDestroy, inject, Injector, runInInjectionContext } from '@angular/core';
import { BehaviorSubject, Subscription, firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { Firestore, collection, addDoc, collectionData, query, where, orderBy, doc, getDoc, updateDoc, arrayUnion, deleteDoc, writeBatch } from '@angular/fire/firestore';
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
  private injector = inject(Injector);
  private userSub: Subscription = new Subscription;

  posts$ = new BehaviorSubject<any[]>([]);
  currentUser: any = null;
  newPostText = '';
  selectedFile: File | null = null;
  selectedFilePreview: string | null = null;
  isLoadingPosts = false;
  isCreatingPost = false;
  errorMessage: string | null = null;
  showProfileMenu = false;
  searchQuery = '';
  searchResults: any[] = [];
  isSearching = false;
  searchError: string | null = null;
  confirmationTitle: string = '';
  confirmationMessage: string = '';
  showConfirmationModal: boolean = false;
  currentAction: 'deletePost' | 'deleteComment' | 'deleteUser' | null = null;
  actionPayload: any = null;

  showProfileModal = false;
  selectedProfile: any = null;
  isLoadingProfile = false;
  profileError: string | null = null;

  async ngOnInit(): Promise<void> {
    this.userSub = this.authService.currentUser$.subscribe({
      next: async (user) => {
        if (!user) {
          this.router.navigate(['/login']);
          return;
        }
        this.currentUser = user;
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
      await runInInjectionContext(this.injector, async () => {
        const postsRef = collection(this.firestore, 'posts');
        let q;

        if (this.currentUser.type === 'admin') {
          // Admin: cargar todas las publicaciones sin filtro de deporte
          q = query(postsRef, orderBy('createdAt', 'desc'));
        } else {
          // Usuario normal: cargar solo publicaciones del deporte del usuario
          const sport = this.currentUser.sport;
          if (!sport) {
            this.errorMessage = 'No tienes un deporte asignado';
            this.posts$.next([]);
            return;
          }
          q = query(postsRef, where('sport', '==', sport), orderBy('createdAt', 'desc'));
        }

        const posts = await firstValueFrom(collectionData(q, { idField: 'id' }));
        const postsWithComments = (posts as any[]).map(post => ({
          ...post,
          newComment: '',
          comments: post.comments || []
        }));
        this.posts$.next(postsWithComments);
      });
    } catch (error: any) {
      console.error('Error al cargar posts:', error);
      this.errorMessage = 'Error al cargar publicaciones';
      this.posts$.next([]);
    } finally {
      this.isLoadingPosts = false;
    }
  }


  async addComment(post: any) {
    if (!post.newComment?.trim() || !this.currentUser) return;

    try {
      const commentData = {
        text: post.newComment.trim(),
        authorId: this.currentUser.uid,
        authorName: this.getDisplayName(this.currentUser),
        authorPhoto: this.getProfileImage(this.currentUser),
        createdAt: new Date().toISOString()
      };

      const postRef = doc(this.firestore, 'posts', post.id);
      await updateDoc(postRef, {
        comments: arrayUnion(commentData)
      });

      const currentPosts = this.posts$.value;
      const updatedPosts = currentPosts.map(p => {
        if (p.id === post.id) {
          return {
            ...p,
            comments: [...(p.comments || []), commentData],
            newComment: ''
          };
        }
        return p;
      });

      this.posts$.next(updatedPosts);
    } catch (error) {
      console.error('Error al añadir comentario:', error);
      this.errorMessage = 'Error al publicar el comentario';
    }
  }

  async viewProfile(authorId: string): Promise<void> {
    if (this.currentUser?.uid === authorId) {
      authorId = this.currentUser.uid;
    }

    this.isLoadingProfile = true;
    this.profileError = null;
    this.showProfileModal = true;

    try {
      await runInInjectionContext(this.injector, async () => {
        const docRef = doc(this.firestore, 'users', authorId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
        const data = docSnap.data();
        // Convertir el objeto de categorías a array si es necesario
        let categories = [];
        if (data['categories']) {
          // Si las categorías están como objeto (como en register-team.component.ts)
          if (typeof data['categories'] === 'object' && !Array.isArray(data['categories'])) {
            categories = Object.values(data['categories']);
          } else {
            categories = data['categories'];
          }
        }

        this.selectedProfile = {
          ...data,
          id: docSnap.id,
          uid: docSnap.id,
          categories: categories // Añadir las categorías procesadas
        };
      } else {
        this.profileError = 'Perfil no encontrado';
      }
      });
    } catch (error) {
      console.error('Error al cargar perfil:', error);
      this.profileError = 'Error al cargar el perfil';
    } finally {
      this.isLoadingProfile = false;
    }
  }

  async onSearchInput(): Promise<void> {
    if (!this.searchQuery.trim()) {
      this.searchResults = [];
      return;
    }

    this.isSearching = true;
    this.searchError = null;

    try {
      const searchTerm = this.searchQuery.toLowerCase().trim();

      await runInInjectionContext(this.injector, async () => {
        const usersRef = collection(this.firestore, 'users');
        let playersQuery;
        let teamsQuery;

        if (this.currentUser.type === 'admin') {
          // Admin: busca en todos los jugadores y equipos sin filtro de deporte
          playersQuery = query(usersRef, where('type', '==', 'player'), orderBy('firstName'));
          teamsQuery = query(usersRef, where('type', '==', 'team'), orderBy('teamName'));
        } else {
          // Usuario normal: busca solo en usuarios de su mismo deporte
          const sport = this.currentUser.sport;
          if (!sport) {
            this.searchResults = [];
            return;
          }
          playersQuery = query(usersRef, where('type', '==', 'player'), where('sport', '==', sport), orderBy('firstName'));
          teamsQuery = query(usersRef, where('type', '==', 'team'), where('sport', '==', sport), orderBy('teamName'));
        }

        const playersSnapshot = await firstValueFrom(collectionData(playersQuery, { idField: 'id' }));
        const teamsSnapshot = await firstValueFrom(collectionData(teamsQuery, { idField: 'id' }));

        const allUsers = [...playersSnapshot as any[], ...teamsSnapshot as any[]];

        this.searchResults = allUsers.filter(user => {
          if (user.type === 'player') {
            const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
            return fullName.includes(searchTerm);
          } else {
            return user.teamName.toLowerCase().includes(searchTerm);
          }
        }).sort((a, b) => {
          const nameA = this.getDisplayName(a).toLowerCase();
          const nameB = this.getDisplayName(b).toLowerCase();
          return nameA.localeCompare(nameB);
        });
      });
    } catch (error) {
      console.error('Error en búsqueda:', error);
      this.searchError = 'Error al realizar la búsqueda';
      this.searchResults = [];
    } finally {
      this.isSearching = false;
    }
  }


  closeProfileModal(): void {
    this.showProfileModal = false;
    this.selectedProfile = null;
    this.profileError = null;
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
    if (user.type === 'admin') return `${user.firstName} ${user.lastName}`;
    return user.type === 'team' ? user.teamName : `${user.firstName} ${user.lastName}`;
  }

  getProfileImage(user: any): string {
    return user.type === 'team' ? (user.teamLogoUrl || '/user-profile.jpg') :
      (user.profilePictureUrl || '/user-profile.jpg');
  }

  navigateToMessages(recipientId: string): void {
    this.closeProfileModal();
    this.router.navigate(['/messages'], {
      queryParams: { recipient: recipientId }
    });
  }

  navigateToMessagesPage(): void {
    this.router.navigate(['/messages']);
  }

  toggleProfileMenu(event: Event): void {
    event.stopPropagation();
    this.showProfileMenu = !this.showProfileMenu;
  }

  shouldShowDeleteButton(profile: any): boolean {
    return this.currentUser?.type === 'admin' && this.currentUser?.uid !== profile.uid;
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
        const filePath = `posts/${this.currentUser.uid}/${Date.now()}_${this.selectedFile.name}`;
        const storageRef = ref(this.storage, filePath);
        await uploadBytes(storageRef, this.selectedFile);
        imageUrl = await getDownloadURL(storageRef);
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

  private commentsEqual(comment1: any, comment2: any): boolean {
    return (
      comment1.text === comment2.text &&
      comment1.authorId === comment2.authorId &&
      comment1.createdAt === comment2.createdAt
    );
  }

  private showConfirmation(title: string, message: string, action: 'deletePost' | 'deleteComment' | 'deleteUser', payload: any): void {
    this.confirmationTitle = title;
    this.confirmationMessage = message;
    this.currentAction = action;
    this.actionPayload = payload;
    this.showConfirmationModal = true;
  }

  cancelAction(): void {
    this.showConfirmationModal = false;
    this.currentAction = null;
    this.actionPayload = null;
  }

  confirmAction(): void {
    if (this.currentAction === 'deletePost') {
      this.deletePostConfirmed(this.actionPayload);
    } else if (this.currentAction === 'deleteComment') {
      this.deleteCommentConfirmed(this.actionPayload.postId, this.actionPayload.comment);
    } else if (this.currentAction === 'deleteUser') {
      this.deleteUserConfirmed(this.actionPayload);
    }
    this.showConfirmationModal = false;
  }

  deletePost(postId: string): void {
    this.showConfirmation(
      'Eliminar publicación',
      '¿Estás seguro de que quieres eliminar esta publicación? Esta acción no se puede deshacer.',
      'deletePost',
      postId
    );
  }

  async deleteUserConfirmed(userId: string): Promise<void> {
    try {
      // 1. Eliminar todas las publicaciones del usuario
      const postsRef = collection(this.firestore, 'posts');
      const userPostsQuery = query(postsRef, where('authorId', '==', userId));
      const userPosts = await firstValueFrom(collectionData(userPostsQuery, { idField: 'id' }));

      const deletePosts = userPosts.map(post =>
        deleteDoc(doc(this.firestore, 'posts', post.id))
      );
      await Promise.all(deletePosts);

      // 2. Eliminar comentarios del usuario en otras publicaciones
      const allPostsQuery = query(postsRef);
      const allPosts = await firstValueFrom(collectionData(allPostsQuery, { idField: 'id' }));

      const updatePosts = allPosts
        .filter(post => post['comments']?.some((c: any) => c.authorId === userId))
        .map(async post => {
          const updatedComments = post['comments'].filter((c: any) => c.authorId !== userId);
          await updateDoc(doc(this.firestore, 'posts', post.id), { comments: updatedComments });
        });
      await Promise.all(updatePosts);

      // 3. Eliminar conversaciones del usuario (igual que en messages.component.ts)
      const conversationsRef = collection(this.firestore, 'conversations');
      const userConversationsQuery = query(
        conversationsRef,
        where('participants', 'array-contains', userId)
      );
      const conversations = await firstValueFrom(collectionData(userConversationsQuery, { idField: 'id' }));

      const deleteConversations = conversations.map(async conv => {
        // Eliminar mensajes primero
        const messagesRef = collection(this.firestore, 'conversations', conv.id, 'messages');
        const messages = await firstValueFrom(collectionData(messagesRef, { idField: 'id' }));

        const batch = writeBatch(this.firestore);
        messages.forEach(msg => {
          batch.delete(doc(this.firestore, 'conversations', conv.id, 'messages', msg.id));
        });
        await batch.commit();

        // Luego eliminar la conversación
        await deleteDoc(doc(this.firestore, 'conversations', conv.id));
      });
      await Promise.all(deleteConversations);

      // 4. Eliminar el usuario de Firestore
      await deleteDoc(doc(this.firestore, 'users', userId));

      // 5. Cerrar el modal de perfil
      this.closeProfileModal();

      this.errorMessage = 'Usuario eliminado con éxito';
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      this.errorMessage = 'Error al eliminar el usuario';
    }
  }

  private async deletePostConfirmed(postId: string): Promise<void> {
    try {
      const postRef = doc(this.firestore, 'posts', postId);
      await deleteDoc(postRef);

      const currentPosts = this.posts$.value;
      const updatedPosts = currentPosts.filter(post => post.id !== postId);
      this.posts$.next(updatedPosts);
    } catch (error) {
      console.error('Error al eliminar el post:', error);
      this.errorMessage = 'Error al eliminar la publicación';
    }
  }

  deleteComment(postId: string, comment: any): void {
    this.showConfirmation(
      'Eliminar comentario',
      '¿Estás seguro de que quieres eliminar este comentario? Esta acción no se puede deshacer.',
      'deleteComment',
      { postId, comment }
    );
  }

  deleteUser(userId: string): void {
    this.showConfirmation(
      'Eliminar usuario',
      '¿Estás seguro de que quieres eliminar este usuario y todo su contenido? Esta acción no se puede deshacer.',
      'deleteUser',
      userId
    );
  }

  private async deleteCommentConfirmed(postId: string, commentToDelete: any): Promise<void> {
    try {
      const postRef = doc(this.firestore, 'posts', postId);
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) return;

      const postData = postSnap.data();
      const updatedComments = postData['comments'].filter(
        (comment: any) => !this.commentsEqual(comment, commentToDelete)
      );

      await updateDoc(postRef, { comments: updatedComments });

      const currentPosts = this.posts$.value;
      const updatedPosts = currentPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: post.comments.filter((comment: any) => !this.commentsEqual(comment, commentToDelete))
          };
        }
        return post;
      });

      this.posts$.next(updatedPosts);
    } catch (error) {
      console.error('Error al eliminar el comentario:', error);
      this.errorMessage = 'Error al eliminar el comentario';
    }
  }

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }
}
