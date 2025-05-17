import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterPlayerComponent } from './auth/register-player/register-player.component';
import { UserTypeSelectorComponent } from './auth/register-player/user-type-selector/user-type-selector.component';
import { RegisterTeamComponent } from './auth/register-team/register-team.component';
import { AuthGuard } from './core/guard/auth.guard';
import { ProfileComponent } from './features/profile/profile.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: UserTypeSelectorComponent },
  { path: 'register/player', component: RegisterPlayerComponent },
  { path: 'register/team', component: RegisterTeamComponent },
  {
    path: 'feed',
    loadComponent: () => import('./features/feed/feed.component').then(m => m.FeedComponent),
  },
  {
    path: 'messages',
    loadComponent: () => import('./features/messages/messages.component').then(m => m.MessagesComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'profile/:id',
    component: ProfileComponent,
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];
