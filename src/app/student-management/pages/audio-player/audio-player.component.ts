import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PresentationService } from '../../services/presentation.service'; // ajusta la ruta si difiere

@Component({
  selector: 'app-audio-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audio-player.component.html',
  styleUrls: ['./audio-player.component.css']
})
export class AudioPlayerComponent implements OnInit {
  id = '';
  loading = false;
  error = '';
  audioUrl: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private presentationService: PresentationService
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.id) {
      this.error = 'ID de presentación inválido';
      return;
    }

    this.loading = true;
    this.presentationService.getAudioUrl(this.id).subscribe({
      next: (url) => {
        this.audioUrl = url;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'No se pudo obtener la URL del audio.';
        this.loading = false;
        console.error(err);
      }
    });
  }
}
