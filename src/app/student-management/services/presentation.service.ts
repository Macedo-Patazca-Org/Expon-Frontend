import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AudioUploadResponse } from '../../student-management/models/audio-response.model';
import { EmotionSummary } from '../../student-management/models/emotion.model';
import { Presentation } from '../../student-management/models/presentation.model';

@Injectable({
  providedIn: 'root'
})
export class PresentationService {
  private readonly API_URL = 'https://ideal-merry-primate.ngrok-free.app/api';

  constructor(private http: HttpClient) {}

  uploadPresentation(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.API_URL}/v1/presentation/upload`, formData);
  }

  getEmotionSummary(presentationId: number): Observable<EmotionSummary> {
    return this.http.get<EmotionSummary>(`${this.API_URL}/presentations/${presentationId}/emotion-summary`);
  }

  getPresentationSummaries(): Observable<Presentation[]> {
    return this.http.get<Presentation[]>(`${this.API_URL}/v1/presentation/summary`);
  }

  generateFeedback(presentationId: string): Observable<any> {
    return this.http.post(`${this.API_URL}/v1/feedback/`, { presentation_id: presentationId });
  }

  getFeedbackByPresentationId(presentationId: string): Observable<any> {
    return this.http.get(`${this.API_URL}/v1/feedback/presentation/${presentationId}`);
  }

}
