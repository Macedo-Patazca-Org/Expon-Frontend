import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../authentication/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const snackBar = inject(MatSnackBar); // 👈 inyectamos el snackbar

  if (authService.isLoggedIn()) {
    return true;
  }

  authService.logout();
  snackBar.open('Sesión expirada, por favor inicia sesión nuevamente', 'Cerrar', {
    duration: 4000,
    panelClass: ['snackbar-warning']
  });

  router.navigate(['/login']);
  return false;
};
