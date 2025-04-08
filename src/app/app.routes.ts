import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { FeedComponent } from './features/feed/feed.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'feed', component: FeedComponent},
  { path: '**', redirectTo: 'login' },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];
