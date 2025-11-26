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
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class PresentationService {
  private readonly API_URL = environment.apiUrl;

  private supabase: SupabaseClient;

  constructor(private http: HttpClient) {
    this.supabase = createClient(
      environment.supaProjectUrl,
      environment.supaAnonKey
    );
  }

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

  // Genera audio TTS (asistente de voz) a partir de la transcripción
  generateTts(presentationId: string, voiceName: string = 'Umbriel') {
    return this.http.post<{
      message: string;
      audio_url: string;
      mime_type: string;
      used_text_preview: string;
    }>(`${this.API_URL}/tts/generate`, {
      presentation_id: presentationId,
      voice_name: voiceName
    });
  }

  /**
   * Busca si ya existe un TTS generado en storage:
   * Ruta esperada: feedback-tts/tts/{userId}/{presentationId}/{archivo}
   * Retorna la URL pública o null si no existe.
   */
  async getExistingTtsUrl(userId: string, presentationId: string): Promise<string | null> {
    const bucket = 'feedback-tts';
    const folder = `tts/${userId}/${presentationId}`;

    console.log('[TTS] Buscando en:', folder);

    const { data, error } = await this.supabase
      .storage
      .from(bucket)
      .list(folder, { limit: 20 }); // traemos varios por seguridad

    if (error || !data || data.length === 0) {
      console.log('[TTS] No hay data o error:', error);
      return null;
    }

    // buscamos un audio real
    const audioFile = data.find(f =>
      f.name.endsWith('.mp3') || f.name.endsWith('.wav')
    );

    if (!audioFile) {
      console.log('[TTS] No se encontró mp3/wav en la carpeta');
      return null;
    }

    const fullPath = `${folder}/${audioFile.name}`;

    const { data: pub } = this.supabase
      .storage
      .from(bucket)
      .getPublicUrl(fullPath);

    return pub?.publicUrl ?? null;
  }

}
