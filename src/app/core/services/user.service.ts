import { Injectable, inject } from '@angular/core';
import { Firestore, doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc } from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL, getStorage } from '@angular/fire/storage';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private firestore = inject(Firestore);
  private storage = inject(Storage);

  async createUser(uid: string, userData: any) {
    try {
      // 1. Primero crea el documento básico en Firestore
      const userDoc = {
        ...userData,
        uid: uid,
        profilePictureUrl: null // Inicialmente null
      };

      // Elimina el archivo binario si existe
      if (userDoc.profilePicture) {
        delete userDoc.profilePicture;
      }

      await setDoc(doc(this.firestore, 'users', uid), userDoc);

      // 2. Si hay imagen, súbela y actualiza
      if (userData.profilePicture) {
        await this.uploadProfilePicture(uid, userData.profilePicture);
      }
    } catch (error) {
      console.error('Error en createUser:', error);
      throw error;
    }
  }

  private async uploadProfilePicture(uid: string, file: File) {
    try {
      const storage = getStorage();
      const filePath = `profile_pictures/${uid}/${Date.now()}_${file.name}`;
      const fileRef = ref(storage, filePath);

      await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(fileRef);

      // Actualiza solo la URL de la imagen
      await updateDoc(doc(this.firestore, 'users', uid), {
        profilePictureUrl: downloadUrl
      });
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<any> {
    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    return querySnapshot;
  }

  async getUserData(uid: string): Promise<any> {
    const docRef = doc(this.firestore, 'users', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  }
}
