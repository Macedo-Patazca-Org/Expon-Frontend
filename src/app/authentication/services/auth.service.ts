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

  logout(): void {
    localStorage.removeItem('token');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }
}
