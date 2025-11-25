import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PresentationService } from '../../services/presentation.service';
import { AuthService } from '../../../authentication/services/auth.service'; 

import WaveSurfer from 'wavesurfer.js';

@Component({
  selector: 'app-audio-player',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audio-player.component.html',
  styleUrls: ['./audio-player.component.css'],
})
export class AudioPlayerComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  userId = '';
  id = '';
  loading = false;
  error = '';
  audioUrl: string | null = null;

  transcription: string | null = null;
  transcriptionLoading = false;
  transcriptionError = '';

  // ===== ORIGINAL PLAYER REFS =====
  @ViewChild('waveform') waveformRef?: ElementRef<HTMLDivElement>;
  @ViewChild('audioRef') audioRef?: ElementRef<HTMLAudioElement>;
  private waveSurfer?: WaveSurfer;

  waveReady = false;
  isPlaying = false;
  duration = 0;
  currentTime = 0;
  playbackRate = 1;

  // ===== TTS PLAYER STATE =====
  ttsAudioUrl: string | null = null;
  ttsLoading = false;
  ttsError = '';

  // modal state
  showVoiceModal = false;
  selectedVoice: 'Umbriel' | 'Sulafat' | null = null;
  showTranscription = false;

  // ===== TTS PLAYER REFS =====
  @ViewChild('waveformTts') waveformTtsRef?: ElementRef<HTMLDivElement>;
  @ViewChild('audioTtsRef') audioTtsRef?: ElementRef<HTMLAudioElement>;
  private waveSurferTts?: WaveSurfer;

  ttsWaveReady = false;
  ttsIsPlaying = false;
  ttsDuration = 0;
  ttsCurrentTime = 0;
  ttsPlaybackRate = 1; // puedes usar el mismo selector si quieres

  private viewReady = false;

  constructor(
    private route: ActivatedRoute,
    private presentationService: PresentationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.id) {
      this.error = 'ID de presentación inválido';
      return;
    }

    this.authService.getCurrentUser().subscribe({
      next: (profile) => {
        console.log('[AudioPlayer] profile completo:', profile);

        this.userId =
          profile.user_id ||   // por si alguna vez llega así
          profile.id ||        // <-- tu caso actual
          '';

        console.log('[AudioPlayer] userId final:', this.userId);

        this.checkExistingTts();
      },
      error: (err) => {
        console.error('[AudioPlayer] No se pudo obtener usuario actual', err);
      }
    });


    // ===== CARGA AUDIO ORIGINAL =====
    this.loading = true;
    this.presentationService.getAudioUrl(this.id).subscribe({
      next: (url) => {
        this.audioUrl = url;
        this.loading = false;
        this.initOriginalIfReady();
      },
      error: (err) => {
        this.error = 'No se pudo obtener la URL del audio.';
        this.loading = false;
        console.error(err);
      },
    });

    this.loadTranscription();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.initOriginalIfReady();
    this.initTtsIfReady();
  }

  ngOnDestroy(): void {
    this.waveSurfer?.destroy();
    this.waveSurferTts?.destroy();
  }

  private async checkExistingTts(): Promise<void> {
    console.log('[AudioPlayer] >>> Ejecutando checkExistingTts()');

    console.log('[AudioPlayer] userId usado:', this.userId);
    console.log('[AudioPlayer] presentationId usado:', this.id);

    if (!this.userId || !this.id) {
      console.warn('[AudioPlayer] No hay userId o presentationId, no se buscará TTS.');
      return;
    }

    try {
      const existingUrl = await this.presentationService.getExistingTtsUrl(
        this.userId,
        this.id
      );

      console.log('[AudioPlayer] Resultado existingUrl:', existingUrl);

      if (existingUrl) {
        this.ttsAudioUrl = existingUrl;
        setTimeout(() => this.initTtsIfReady(), 0);
      }
    } catch (e) {
      console.warn('[AudioPlayer] No se pudo verificar TTS existente', e);
    }
  }

  // ======================================================
  // =============== ORIGINAL WAVESURFER ==================
  // ======================================================
  private initOriginalIfReady(): void {
    if (!this.viewReady) return;
    if (!this.audioUrl) return;
    if (!this.waveformRef || !this.audioRef) return;
    if (this.waveSurfer) return;

    const audioEl = this.audioRef.nativeElement;
    audioEl.src = this.audioUrl;

    audioEl.onloadedmetadata = () => {
      this.setupOriginalWaveSurfer(audioEl);
    };

    audioEl.load();
  }

  private setupOriginalWaveSurfer(audioEl: HTMLAudioElement): void {
    if (!this.waveformRef) return;
    if (this.waveSurfer) return;

    this.waveSurfer = WaveSurfer.create({
      container: this.waveformRef.nativeElement,
      waveColor: '#c7d5ff',
      progressColor: '#35596b',
      cursorColor: '#35596b',
      barWidth: 2,
      barRadius: 3,
      height: 100,
      media: audioEl,
      dragToSeek: true,
    });

    this.waveSurfer.on('ready', () => {
      this.waveReady = true;
      this.duration = this.waveSurfer?.getDuration() ?? 0;
      this.waveSurfer?.setPlaybackRate(this.playbackRate);
    });

    this.waveSurfer.on('play', () => (this.isPlaying = true));
    this.waveSurfer.on('pause', () => (this.isPlaying = false));

    this.waveSurfer.on('timeupdate', (t: number) => {
      this.currentTime = t || 0;
    });

    this.waveSurfer.on('error', (e) => {
      console.error('[AudioPlayer] WaveSurfer error', e);
    });
  }

  togglePlay(): void {
    if (!this.waveSurfer || !this.waveReady) return;
    this.waveSurfer.playPause();
  }

  stop(): void {
    if (!this.waveSurfer || !this.waveReady) return;
    this.waveSurfer.stop();
    this.currentTime = 0;
  }

  changeSpeed(): void {
    if (!this.waveSurfer || !this.waveReady) return;
    this.waveSurfer.setPlaybackRate(this.playbackRate);
  }

  // ======================================================
  // =================== TTS WAVESURFER ===================
  // ======================================================
  private initTtsIfReady(): void {
    if (!this.viewReady) return;
    if (!this.ttsAudioUrl) return;
    if (!this.waveformTtsRef || !this.audioTtsRef) return;

    // ✅ si existe pero el src cambió, reinicia
    if (this.waveSurferTts) {
      this.waveSurferTts.destroy();
      this.waveSurferTts = undefined;
      this.ttsWaveReady = false;
    }

    const audioEl = this.audioTtsRef.nativeElement;
    audioEl.src = this.ttsAudioUrl;

    audioEl.onloadedmetadata = () => {
      this.setupTtsWaveSurfer(audioEl);
    };

    audioEl.load();
  }

  private setupTtsWaveSurfer(audioEl: HTMLAudioElement): void {
    if (!this.waveformTtsRef) return;
    if (this.waveSurferTts) return;

    this.waveSurferTts = WaveSurfer.create({
      container: this.waveformTtsRef.nativeElement,
      waveColor: '#c7d5ff',
      progressColor: '#35596b',
      cursorColor: '#35596b',
      barWidth: 2,
      barRadius: 3,
      height: 90,
      media: audioEl,
      dragToSeek: true,
    });

    this.waveSurferTts.on('ready', () => {
      this.ttsWaveReady = true;
      this.ttsDuration = this.waveSurferTts?.getDuration() ?? 0;
      this.waveSurferTts?.setPlaybackRate(this.ttsPlaybackRate);
    });

    this.waveSurferTts.on('play', () => (this.ttsIsPlaying = true));
    this.waveSurferTts.on('pause', () => (this.ttsIsPlaying = false));

    this.waveSurferTts.on('timeupdate', (t: number) => {
      this.ttsCurrentTime = t || 0;
    });

    this.waveSurferTts.on('error', (e) => {
      console.error('[AudioPlayer] WaveSurfer TTS error', e);
    });
  }

  togglePlayTts(): void {
    if (!this.waveSurferTts || !this.ttsWaveReady) return;
    this.waveSurferTts.playPause();
  }

  stopTts(): void {
    if (!this.waveSurferTts || !this.ttsWaveReady) return;
    this.waveSurferTts.stop();
    this.ttsCurrentTime = 0;
  }

  changeSpeedTts(): void {
    if (!this.waveSurferTts || !this.ttsWaveReady) return;
    this.waveSurferTts.setPlaybackRate(this.ttsPlaybackRate);
  }

  // ======================================================
  // =================== MODAL + GENERAR ==================
  // ======================================================
  openVoiceModal(): void {
    this.showVoiceModal = true;
    this.selectedVoice = null;
  }

  closeVoiceModal(): void {
    this.showVoiceModal = false;
  }

  confirmVoiceAndGenerate(): void {
    if (!this.selectedVoice) return;
    this.showVoiceModal = false;
    this.generateReferenceAudio(this.selectedVoice);
  }

  private generateReferenceAudio(voice: 'Umbriel' | 'Sulafat'): void {
    if (!this.id) return;

    // reset
    this.ttsLoading = true;
    this.ttsError = '';
    this.ttsAudioUrl = null;
    this.ttsWaveReady = false;
    this.ttsIsPlaying = false;
    this.ttsCurrentTime = 0;
    this.ttsDuration = 0;

    // destruye wavesurfer anterior si existía
    this.waveSurferTts?.destroy();
    this.waveSurferTts = undefined;

    this.presentationService.generateTts(this.id, voice).subscribe({
      next: async (res) => {
        this.ttsLoading = false;

        const baseUrl = res.audio_url;
        let okUrl: string | null = null;

        for (let i = 0; i < 5; i++) {
          const testUrl = `${baseUrl}?t=${Date.now()}`;
          const audio = new Audio(testUrl);

          okUrl = await new Promise<string | null>((resolve) => {
            audio.onloadedmetadata = () => resolve(testUrl);
            audio.onerror = () => resolve(null);
          });

          if (okUrl) break;
          await new Promise(r => setTimeout(r, 600)); // espera 0.6s
        }

        if (okUrl) {
          this.ttsAudioUrl = okUrl;
          setTimeout(() => this.initTtsIfReady(), 0);
        } else {
          this.ttsError = 'El audio aún no está disponible. Intenta otra vez.';
        }
      },
      error: (err) => {
        console.error('[AudioPlayer] Error generando TTS', err);
        this.ttsError = 'No se pudo generar el audio de referencia.';
        this.ttsLoading = false;
      }
    });
  }

  // ======================================================
  // ================= UTILIDADES =========================
  // ======================================================
  formatTime(value: number): string {
    if (!value || isNaN(value)) return '00:00';

    const totalSeconds = Math.floor(value);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const m = minutes.toString().padStart(2, '0');
    const s = seconds.toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  private loadTranscription(): void {
    this.transcriptionLoading = true;
    this.transcriptionError = '';
    this.transcription = null;

    this.presentationService.getPresentationById(this.id).subscribe({
      next: (detail) => {
        this.transcription = detail.transcript || null;
        this.transcriptionLoading = false;
      },
      error: (err) => {
        console.error('[AudioPlayer] Error cargando transcripción', err);
        this.transcriptionError = 'No se pudo cargar la transcripción.';
        this.transcriptionLoading = false;
      }
    });
  }
}