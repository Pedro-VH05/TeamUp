import { Injectable, inject } from '@angular/core';
import { Firestore, doc, setDoc, getDoc, collection, query, where, getDocs } from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private firestore = inject(Firestore);
  private storage = inject(Storage);

  async createUser(uid: string, userData: any) {
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
