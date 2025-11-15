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
  id = '';
  loading = false;
  error = '';
  audioUrl: string | null = null;
  transcription: string | null = null;
  transcriptionLoading = false;
  transcriptionError = '';

  @ViewChild('waveform') waveformRef?: ElementRef<HTMLDivElement>;
  @ViewChild('audioRef') audioRef?: ElementRef<HTMLAudioElement>;

  private waveSurfer?: WaveSurfer;

  waveReady = false;
  isPlaying = false;
  duration = 0;
  currentTime = 0;
  playbackRate = 1;

  private viewReady = false;

  constructor(
    private route: ActivatedRoute,
    private presentationService: PresentationService
  ) {}

  // 1) Obtener ID y URL firmada de Supabase
  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.id) {
      this.error = 'ID de presentación inválido';
      return;
    }

    this.loading = true;
    this.presentationService.getAudioUrl(this.id).subscribe({
      next: (url) => {
        console.log('[AudioPlayer] URL recibida:', url);
        this.audioUrl = url;
        this.loading = false;
        this.initIfReady();
      },
      error: (err) => {
        this.error = 'No se pudo obtener la URL del audio.';
        this.loading = false;
        console.error(err);
      },
    });

    this.loadTranscription();
  }

  // 2) La vista ya está montada (#waveform y #audioRef existen)
  ngAfterViewInit(): void {
    this.viewReady = true;
    this.initIfReady();
  }

  ngOnDestroy(): void {
    this.waveSurfer?.destroy();
  }

  /**
   * Inicializa el <audio> y luego WaveSurfer cuando:
   * - la vista está lista
   * - ya tenemos audioUrl
   * - existen waveformRef y audioRef
   */
  private initIfReady(): void {
    if (!this.viewReady) return;
    if (!this.audioUrl) return;
    if (!this.waveformRef || !this.audioRef) return;
    if (this.waveSurfer) return;

    const audioEl = this.audioRef.nativeElement;

    // Asignamos la URL directamente al audio nativo
    audioEl.src = this.audioUrl;
    console.log('[AudioPlayer] src asignado al <audio>:', audioEl.src);

    // Cuando el navegador carga los metadatos, creamos WaveSurfer
    audioEl.onloadedmetadata = () => {
      console.log('[AudioPlayer] loadedmetadata, duración:', audioEl.duration);
      this.setupWaveSurfer(audioEl);
    };

    // Forzamos la carga
    audioEl.load();
  }

  private setupWaveSurfer(audioEl: HTMLAudioElement): void {
    if (!this.waveformRef) return;
    if (this.waveSurfer) return;

    console.log('[AudioPlayer] Inicializando WaveSurfer con media…');

    this.waveSurfer = WaveSurfer.create({
      container: this.waveformRef.nativeElement,
      waveColor: '#c7d5ff',
      progressColor: '#35596b',
      cursorColor: '#35596b',
      barWidth: 2,
      barRadius: 3,
      height: 100,
      media: audioEl,   // usa el <audio> nativo
      dragToSeek: true, // permite hacer seek en la onda
    });

    this.waveSurfer.on('ready', () => {
      console.log('[AudioPlayer] WaveSurfer ready');
      this.waveReady = true;
      this.duration = this.waveSurfer?.getDuration() ?? 0;
      this.waveSurfer?.setPlaybackRate(this.playbackRate);
    });

    this.waveSurfer.on('play', () => {
      this.isPlaying = true;
    });

    this.waveSurfer.on('pause', () => {
      this.isPlaying = false;
    });

    this.waveSurfer.on('timeupdate', (currentTime: number) => {
      this.currentTime = currentTime || 0;
    });

    this.waveSurfer.on('error', (e) => {
      console.error('[AudioPlayer] WaveSurfer error', e);
    });
  }

  // ----- Controles -----

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

  // Formatea segundos a mm:ss
  formatTime(value: number): string {
    if (!value || isNaN(value)) {
      return '00:00';
    }

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
        // El backend devuelve "transcript" (tal como pegaste del Swagger)
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