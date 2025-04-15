import { Injectable, inject } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { UserService } from './user.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private router = inject(Router);
  private userService = inject(UserService);
  private currentUserSubject = new BehaviorSubject<any>(null);

  constructor() {
    onAuthStateChanged(this.auth, user => {
      if (user) {
        this.userService.getUserData(user.uid).then((userData) => {
          this.currentUserSubject.next(userData);
        });
      } else {
        this.currentUserSubject.next(null);
      }
    })
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

  async registerTeam(basicData: any, additionalData: any, password: string) {
    const userCredential = await createUserWithEmailAndPassword(
      this.auth,
      basicData.email,
      password
    );

    const fullTeamData = {
      ...basicData,
      ...additionalData,
      type: 'team',
      registrationDate: new Date().toISOString()
    };

    await this.userService.createUser(userCredential.user.uid, fullTeamData);
    return userCredential.user;
  }

  // Iniciar Sesión
  async login(email: string, password: string) {
    const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
    return userCredential.user;
  }

  get currentUser$() {
    return this.currentUserSubject.asObservable();
  }

  // Cerrar Sesión
  async logout() {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }
}
