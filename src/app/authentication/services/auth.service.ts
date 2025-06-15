import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  login(credentials: { email: string; password: string }): Observable<any> {
    if (credentials.email === 'admin@expon.com' && credentials.password === '123456') {
      localStorage.setItem('token', 'FAKE-TOKEN');
      return of({
        token: 'FAKE-TOKEN',
        user: { name: 'Admin' }
      });
    } else {
      return throwError(() => new Error('Credenciales inválidas'));
    }
  }

  register(user: { username: string; email: string; password: string }): Observable<any> {
    if (user.username && user.email && user.password) {
      return of({
        message: 'Registro exitoso',
        user: {
          username: user.username,
          email: user.email
        }
      });
    } else {
      return throwError(() => new Error('Todos los campos son obligatorios'));
    }
  }

  logout(): void {
    localStorage.removeItem('token');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  recoverPassword(newPassword: string): Observable<any> {
    if (!newPassword || newPassword.length < 6) {
      return throwError(() => new Error('La contraseña debe tener al menos 6 caracteres'));
    }

    // Simulación de actualización
    return of({ message: 'Contraseña actualizada correctamente' });
  }
}
