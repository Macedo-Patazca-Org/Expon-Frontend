import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Presentation,
  PresentationDetail
} from '../../student-management/models/presentation.model';
import { AudioUploadResponse } from '../../student-management/models/audio-response.model';
import { EmotionSummary } from '../../student-management/models/emotion.model';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PresentationService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ⬇️ Este endpoint devuelve el DETALLE completo (incluye transcript, probabilities, metadata)
  uploadPresentation(file: File): Observable<PresentationDetail> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<PresentationDetail>(`${this.API_URL}/presentation/upload`, formData);
  }

  getEmotionSummary(presentationId: number): Observable<EmotionSummary> {
    return this.http.get<EmotionSummary>(`${this.API_URL}/presentations/${presentationId}/emotion-summary`);
  }

  // ⬇️ Listado/summary (usa el tipo compacto)
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

  // ⬇️ DETALLE por id (incluye transcript, probabilities, metadata)
  getPresentationById(presentationId: string): Observable<PresentationDetail> {
    return this.http.get<PresentationDetail>(`${this.API_URL}/presentation/${presentationId}`);
  }

  getAudioUrl(presentationId: string) {
  // el backend responde un string (la URL firmada), por eso usamos responseType 'text'
    return this.http.get<any>(`${this.API_URL}/presentation/${presentationId}/audio-url`).pipe(
      map((res) => typeof res === 'string' ? res : res.url)
    );

}

}
