// Ya existente (para listados/summary)
export interface Presentation {
  id: string;
  filename: string;
  dominant_emotion: string;
  confidence: number;
  created_at: string; // ISO
}

// 🔹 NUEVO: detalle (cuando llamas GET /presentation/{id})
export interface AudioMetadata {
  duration: number;
  sample_rate: number;
  language: string;
}

export interface PresentationDetail extends Presentation {
  transcript: string;
  emotion_probabilities: { [key: string]: number };
  metadata: AudioMetadata;
}
