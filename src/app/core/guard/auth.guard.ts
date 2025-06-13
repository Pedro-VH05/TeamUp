import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { catchError, filter, map, switchMap, take } from 'rxjs/operators';
import { of } from 'rxjs';

export const AuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.authReady$.pipe(
    filter(ready => ready),
    take(1),
    switchMap(() => authService.currentUser$),
    take(1),
    map(user => {
      if (user) {
        return true;
      }
      console.log('Redirigiendo a login desde AuthGuard');
      router.navigate(['/login'], {
        queryParams: { returnUrl: state.url },
        replaceUrl: true // Evita que el login aparezca en el historial
      });
      return false;
    }),
    catchError(() => {
      router.navigate(['/login']);
      return of(false);
    })
  );
};
