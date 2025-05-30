import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { getApps, initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getDatabase, provideDatabase } from '@angular/fire/database';
import { getMessaging, provideMessaging } from '@angular/fire/messaging';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), provideHttpClient(), provideRouter(routes), provideClientHydration(withEventReplay()), provideFirebaseApp(() => {
    if (!getApps().length) {
      return initializeApp({
        projectId: "teamup-fd251",
        appId: "1:385199238281:web:560e0d15cbe0b24498aa58",
        storageBucket: "teamup-fd251.appspot.com",
        apiKey: "AIzaSyBsqA6JdyYCzp1AlCHjQhbt3_v7JiVXXW0",
        authDomain: "teamup-fd251.firebaseapp.com",
        messagingSenderId: "385199238281",
        measurementId: "G-CWZB81KG7B"
      });
    } else {
      return getApps()[0];
    }
  }), provideAuth(() => getAuth()), provideFirestore(() => getFirestore()), provideDatabase(() => getDatabase()), provideMessaging(() => getMessaging()), provideStorage(() => getStorage())]
};
