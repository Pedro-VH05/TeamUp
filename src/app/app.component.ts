import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { CommonModule, NgIf } from '@angular/common';

@Component({
  selector: 'app-root',
  template: `
    <div *ngIf="authService.authReady$ | async; else loading">
      <router-outlet></router-outlet>
    </div>
    <ng-template #loading>
      <div class="loading-screen">Cargando aplicación...</div>
    </ng-template>
  `,
  standalone: true,
  imports: [RouterOutlet, CommonModule, NgIf]
})
export class AppComponent {
  constructor(public authService: AuthService) {}
}
