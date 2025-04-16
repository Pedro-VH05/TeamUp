import { Injectable, inject } from '@angular/core';
import { Firestore, doc, setDoc, getDoc } from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private firestore = inject(Firestore);
  private storage = inject(Storage);

  async createUser(uid: string, userData: any) {
    // Subir foto de perfil si existe
    if (userData.profilePicture) {
      const filePath = `profile_pictures/${uid}_${Date.now()}`;
      const fileRef = ref(this.storage, filePath);
      await uploadBytes(fileRef, userData.profilePicture);
      userData.profilePictureUrl = await getDownloadURL(fileRef);
      delete userData.profilePicture;
    }

    userData.uid = uid;

    await setDoc(doc(this.firestore, 'users', uid), userData);
  }

  async getUserData(uid: string) {
    const userDoc = await getDoc(doc(this.firestore, 'users', uid));
    return userDoc.exists() ? userDoc.data() : null;
  }
}
