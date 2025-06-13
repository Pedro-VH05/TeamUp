import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterPlayerComponent } from './auth/register-player/register-player.component';
import { UserTypeSelectorComponent } from './auth/register-player/user-type-selector/user-type-selector.component';
import { RegisterTeamComponent } from './auth/register-team/register-team.component';
import { AuthGuard } from './core/guard/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./auth/register-player/user-type-selector/user-type-selector.component').then(m => m.UserTypeSelectorComponent)
  },
  {
    path: 'register/player',
    loadComponent: () => import('./auth/register-player/register-player.component').then(m => m.RegisterPlayerComponent)
  },
  {
    path: 'register/team',
    loadComponent: () => import('./auth/register-team/register-team.component').then(m => m.RegisterTeamComponent)
  },
  {
    path: 'feed',
    loadComponent: () => import('./features/feed/feed.component').then(m => m.FeedComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'messages',
    loadComponent: () => import('./features/messages/messages.component').then(m => m.MessagesComponent),
    canActivate: [AuthGuard]
  },
  {
    path: '',
    redirectTo: 'feed',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'feed'
  }
];
