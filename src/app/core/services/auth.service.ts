import { Injectable, inject } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { UserService } from './user.service';
import { BehaviorSubject, distinctUntilChanged, Observable, take } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private router = inject(Router);
  private userService = inject(UserService);
  private currentUserSubject = new BehaviorSubject<any>(null);
  private authInitialized = false;

  constructor() {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    onAuthStateChanged(this.auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        try {
          const userData = await this.userService.getUserData(firebaseUser.uid);
          if (userData) {
            this.currentUserSubject.next({ ...firebaseUser, ...userData });
          } else {
            console.warn('Usuario autenticado pero sin datos en Firestore');
            this.currentUserSubject.next(null);
          }
        } catch (error) {
          console.error('Error al cargar datos del usuario:', error);
          this.currentUserSubject.next(null);
        }
      } else {
        this.currentUserSubject.next(null);
      }
      this.authInitialized = true;
    });
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

    const fullPlayerData = {
      ...basicData,
      ...additionalData,
      type: 'player',
      registrationDate: new Date().toISOString()
    };

    await this.userService.createUser(userCredential.user.uid, fullPlayerData);
    return userCredential.user;
  }

  async registerTeam(email: string, password: string) {
    const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
    return userCredential.user;
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
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const userData = await this.userService.getUserData(userCredential.user.uid);

      if (!userData) {
        throw new Error('No se encontraron datos de usuario');
      }

      console.log('Usuario después de login:', userData);
      this.currentUserSubject.next(userData);
      return userCredential.user;
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  }

  get currentUser$(): Observable<any> {
    return this.currentUserSubject.asObservable().pipe(distinctUntilChanged());
  }

  async logout() {
    await signOut(this.auth);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }
}
