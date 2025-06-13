import { Injectable, inject } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, reauthenticateWithCredential, signInWithEmailAndPassword, signInWithPopup, signOut, updatePassword, User } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { UserService } from './user.service';
import { BehaviorSubject, distinctUntilChanged, Observable, take } from 'rxjs';
import { browserLocalPersistence, EmailAuthProvider, fetchSignInMethodsForEmail, linkWithCredential, linkWithPopup, setPersistence, signInWithRedirect } from 'firebase/auth';

@Injectable({
  providedIn: 'root'
})

export class AuthService {
  [x: string]: any;
  private auth = inject(Auth);
  private router = inject(Router);
  private userService = inject(UserService);
  private currentUserSubject = new BehaviorSubject<any>(null);
  private authInitialized = false;
  private pendingLinkEmail: string | null = null;
  private pendingLinkPassword: string | null = null;
  private authReadySubject = new BehaviorSubject<boolean>(false);
  authReady$ = this.authReadySubject.asObservable();


  constructor() {
    this.initializeAuth();
    this.setAuthPersistence();
  }

  private async setAuthPersistence(): Promise<void> {
    try {
      // Usar persistencia local (mantiene la sesión incluso después de cerrar el navegador)
      await setPersistence(this.auth, browserLocalPersistence);
      console.log('Persistencia de autenticación configurada');
    } catch (error) {
      console.error('Error al configurar persistencia:', error);
    }
  }


  private async initializeAuth(): Promise<void> {
    try {
      await setPersistence(this.auth, browserLocalPersistence);

      onAuthStateChanged(this.auth, async (firebaseUser) => {
        console.log('Firebase auth state changed:', firebaseUser?.uid);

        if (firebaseUser) {
          try {
            const userData = await this.userService.getUserData(firebaseUser.uid);
            if (userData) {
              this.currentUserSubject.next({ ...firebaseUser, ...userData });
            } else {
              console.warn('Usuario autenticado pero sin datos en Firestore');
              this.currentUserSubject.next(null);
              await this.auth.signOut();
            }
          } catch (error) {
            console.error('Error al cargar datos del usuario:', error);
            this.currentUserSubject.next(null);
            await this.auth.signOut();
          }
        } else {
          this.currentUserSubject.next(null);
        }

        if (!this.authReadySubject.value) {
          this.authReadySubject.next(true);
        }
      });
    } catch (error) {
      console.error('Error inicializando autenticación:', error);
      this.authReadySubject.next(true);
    }
  }

  async getCurrentUser(): Promise<any> {
    if (!this.authInitialized) {
      await new Promise(resolve => {
        const sub = this.currentUser$.subscribe(user => {
          if (this.authInitialized) {
            sub.unsubscribe();
            resolve(user);
          }
        });
      });
    }
    return this.currentUserSubject.value;
  }

  async registerPlayer(basicData: any, additionalData: any, password: string) {
    const userCredential = await createUserWithEmailAndPassword(
      this.auth,
      basicData.email,
      password
    );

    const userDoc = {
      ...basicData,
      ...additionalData,
      type: 'player',
      registrationDate: new Date().toISOString()
    };

    await this.userService.createUser(userCredential.user.uid, userDoc);
    return userCredential.user;
  }

  async registerTeam(email: string, password: string) {
    const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
    return userCredential;
  }

  async saveTeamData(teamData: any) {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      throw new Error('No hay usuario autenticado para guardar los datos del equipo.');
    }

    const formattedData = {
      ...teamData,
      type: 'team',
      registrationDate: new Date().toISOString(),
      categories: teamData.categories?.reduce((acc: any, category: any, index: number) => {
        acc[`category_${index}`] = category;
        return acc;
      }, {})
    };

    await this.userService.createUser(currentUser.uid, formattedData);
  }

  async login(email: string, password: string) {
    try {
      await setPersistence(this.auth, browserLocalPersistence);

      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const userData = await this.userService.getUserData(userCredential.user.uid);

      if (!userData) {
        throw new Error('No se encontraron datos de usuario');
      }

      this.currentUserSubject.next({ ...userCredential.user, ...userData });
        return userCredential.user;
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  }

  async isEmailRegistered(email: string): Promise<boolean> {
    const users = await this.userService.getUserByEmail(email);
    return !users.empty;
  }

  get currentUser$(): Observable<any> {
    return this.currentUserSubject.asObservable().pipe(distinctUntilChanged());
  }

  async logout() {
    await signOut(this.auth);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  async loginWithEmail(email: string, password: string) {
    try {
      return await signInWithEmailAndPassword(this.auth, email, password);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        const methods = await fetchSignInMethodsForEmail(this.auth, email);

        // 🟡 Si el correo está registrado con Google pero no con password
        if (methods.includes('google.com') && !methods.includes('password')) {
          // Iniciar sesión con Google
          const provider = new GoogleAuthProvider();
          const result = await signInWithPopup(this.auth, provider);

          if (result.user.email?.toLowerCase() !== email.toLowerCase()) {
            await signOut(this.auth);
            throw new Error('El correo de Google no coincide.');
          }

          // 🔐 Vincular password
          const emailCredential = EmailAuthProvider.credential(email, password);
          await linkWithCredential(result.user, emailCredential);

          console.log('✅ Vinculación exitosa de contraseña');
          return result;
        }
      }

      console.error('Error en loginWithEmail:', error);
      throw error;
    }
  }

  async completeAccountLink(): Promise<void> {
    if (!this.pendingLinkEmail || !this.pendingLinkPassword) {
      throw new Error('Datos para vinculación no encontrados');
    }

    try {
      const emailCred = EmailAuthProvider.credential(
        this.pendingLinkEmail,
        this.pendingLinkPassword
      );

      const user = this.auth.currentUser;
      if (!user) throw new Error('Usuario no autenticado');

      await linkWithCredential(user, emailCred);

      this.pendingLinkEmail = null;
      this.pendingLinkPassword = null;

    } catch (error) {
      console.error('Error en vinculación:', error);
      throw error;
    }
  }

  async changePassword(email: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      // Reautenticar al usuario
      const user = this.auth.currentUser;
      if (!user || !user.email) throw new Error('Usuario no autenticado');

      const credential = EmailAuthProvider.credential(email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Cambiar la contraseña
      await updatePassword(user, newPassword);
    } catch (error: any) {
      console.error('Error al cambiar contraseña:', error);
      throw new Error(this.getFriendlyErrorMessage(error));
    }
  }

  private getFriendlyErrorMessage(error: any): string {
    switch (error.code) {
      case 'auth/wrong-password':
        return 'La contraseña actual es incorrecta';
      case 'auth/weak-password':
        return 'La nueva contraseña es demasiado débil';
      case 'auth/requires-recent-login':
        return 'Debes iniciar sesión nuevamente para cambiar la contraseña';
      default:
        return 'Error al cambiar la contraseña';
    }
  }
}
