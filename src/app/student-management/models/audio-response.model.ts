import { EmotionSummary } from './emotion.model';

export interface AudioUploadResponse {
  success: boolean;
  message: string;
  analysisData: EmotionSummary;
}
