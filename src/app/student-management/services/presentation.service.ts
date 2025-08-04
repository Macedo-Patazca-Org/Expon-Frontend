import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AudioUploadResponse } from '../../student-management/models/audio-response.model';
import { EmotionSummary } from '../../student-management/models/emotion.model';
import { Presentation } from '../../student-management/models/presentation.model';

@Injectable({
  providedIn: 'root'
})
export class PresentationService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  uploadPresentation(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.API_URL}/presentation/upload`, formData);
  }

  getEmotionSummary(presentationId: number): Observable<EmotionSummary> {
    return this.http.get<EmotionSummary>(`${this.API_URL}/presentations/${presentationId}/emotion-summary`);
  }

  getPresentationSummaries(): Observable<Presentation[]> {
    return this.http.get<Presentation[]>(`${this.API_URL}/presentation/summary`);
  }

  generateFeedback(presentationId: string): Observable<any> {
    return this.http.post(`${this.API_URL}/feedback/`, { presentation_id: presentationId });
  }

  getFeedbackByPresentationId(presentationId: string): Observable<any> {
    return this.http.get(`${this.API_URL}/feedback/presentation/${presentationId}`);
  }

  deletePresentation(id: string) {
    return this.http.delete(`${this.API_URL}/presentation/${id}`);
  }

}
