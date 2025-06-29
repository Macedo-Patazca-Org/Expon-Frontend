import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Profile } from '../models/profile.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private readonly baseUrl = 'http://localhost:8000/api/v1/profile';

  constructor(private http: HttpClient) {}

  getMyProfile(): Observable<Profile> {
    return this.http.get<Profile>(`${this.baseUrl}/me`);
  }

  updateProfile(profile: Profile): Observable<Profile> {
    return this.http.put<Profile>(`${this.baseUrl}/me`, profile);
  }

  createProfile(profile: Profile): Observable<Profile> {
    return this.http.post<Profile>(`${this.baseUrl}/me`, profile);
  }
}
