import { Injectable, inject } from '@angular/core';
import { Firestore, doc, setDoc, getDoc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private firestore = inject(Firestore);

  constructor() {}

  // Crear usuario en Firestore
  async createUser(uid: string, type: 'player' | 'team', userData: any) {
    await setDoc(doc(this.firestore, 'users', uid), {
      uid,
      type,
      ...userData
    });
  }

  // Obtener datos de usuario
  async getUserData(uid: string) {
    const userDoc = await getDoc(doc(this.firestore, 'users', uid));
    return userDoc.exists() ? userDoc.data() : null;
  }
}
