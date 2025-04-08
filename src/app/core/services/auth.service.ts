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

  // Registro de Jugador
  async registerPlayer(playerData: any, password: string) {
    const userCredential = await createUserWithEmailAndPassword(this.auth, playerData.email, password);
    await this.userService.createUser(userCredential.user.uid, 'player', playerData);
    return userCredential.user;
  }

  // Registro de Equipo
  async registerTeam(teamData: any, password: string) {
    const userCredential = await createUserWithEmailAndPassword(this.auth, teamData.email, password);
    await this.userService.createUser(userCredential.user.uid, 'team', teamData);
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
