import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { FeedComponent } from './features/feed/feed.component';
import { RegisterPlayerComponent } from './auth/register-player/register-player.component';
import { UserTypeSelectorComponent } from './auth/register-player/user-type-selector/user-type-selector.component';
import { RegisterTeamComponent } from './auth/register-team/register-team.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: UserTypeSelectorComponent },
  { path: 'register/player', component: RegisterPlayerComponent },
  { path: 'register/team', component: RegisterTeamComponent },
  { path: 'feed', component: FeedComponent},
  { path: '**', redirectTo: 'login' },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];
