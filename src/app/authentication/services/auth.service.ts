import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Profile } from '../../user-profile/models/profile.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private loginUrl = 'https://ideal-merry-primate.ngrok-free.app/api/v1/auth/login';
  private registerUrl = 'https://ideal-merry-primate.ngrok-free.app/api/v1/auth/signup';
  private recoverUrl = 'https://ideal-merry-primate.ngrok-free.app/api/v1/auth/recover-password'; 
  private meUrl = 'https://ideal-merry-primate.ngrok-free.app/api/v1/auth/me';

  constructor(private http: HttpClient) {}

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post(this.loginUrl, credentials);
  }

  register(user: { username: string; email: string; password: string }): Observable<any> {
    return this.http.post(this.registerUrl, user);
  }

  recoverPassword(newPassword: string): Observable<any> {
    return this.http.post(this.recoverUrl, { password: newPassword });
  }

  getCurrentUser(): Observable<Profile> {
    const token = this.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
    return this.http.get<Profile>(this.meUrl, { headers });
  }

  saveToken(token: string): void {
    localStorage.setItem('access_token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  logout(): void {
    localStorage.removeItem('access_token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken() && !this.isTokenExpired();
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp;
      const now = Math.floor(Date.now() / 1000);
      return expiry < now;
    } catch (e) {
      return true; // token malformado
    }
  }
}