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
  private readonly API_URL = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  uploadAudio(file: File): Observable<AudioUploadResponse> {
    const formData = new FormData();
    formData.append('audio', file);
    return this.http.post<AudioUploadResponse>(`${this.API_URL}/presentations/upload`, formData);
  }

  getEmotionSummary(presentationId: number): Observable<EmotionSummary> {
    return this.http.get<EmotionSummary>(`${this.API_URL}/presentations/${presentationId}/emotion-summary`);
  }

  getPresentationSummaries(): Observable<Presentation[]> {
    return this.http.get<Presentation[]>(`${this.API_URL}/v1/presentation/summary`);
  }

}
