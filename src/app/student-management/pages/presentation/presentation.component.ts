import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';

import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';



import { PresentationService } from '../../services/presentation.service';

@Component({
  selector: 'app-presentation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatDialogModule,
  ],
  templateUrl: './presentation.component.html',
  styleUrls: ['./presentation.component.css'],
  providers: [PresentationService]
})
export class PresentationComponent {
  selectedPurpose: string = '';
  selectedFile: File | null = null;
  uploadResult: any = null;
  uploadError: boolean = false;
  isLoading: boolean = false;

  // Grabación de audio
  mediaRecorder!: MediaRecorder;
  audioChunks: Blob[] = [];
  isRecording: boolean = false;
  recordingTime: number = 0;
  recordingInterval: any;

constructor(
  private presentationService: PresentationService,
  private cdr: ChangeDetectorRef,
  private router: Router
) {}


  resetPurpose() {
    this.selectedPurpose = '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.uploadAudio();
    }
  }

  uploadAudio(): void {
    if (!this.selectedFile) return;

    this.uploadError = false;
    this.uploadResult = null;
    this.isLoading = true;

    this.presentationService.uploadPresentation(this.selectedFile).subscribe({
      next: (res) => {
        console.log('✅ Response from backend:', res);
        const id = res.id;

        // Generar feedback antes de redirigir
        this.presentationService.generateFeedback(id).subscribe({
          next: () => {
            this.isLoading = false;
            this.router.navigate(['/design/feedback-config', id]);
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('❌ Error generating feedback:', err);
            this.uploadError = true;
            this.isLoading = false;
          }
        });
      },
      error: (err) => {
        console.error('❌ Error uploading presentation:', err);
        this.uploadError = true;
        this.isLoading = false;
      }
    });
  }

  // MÉTODOS DE GRABACIÓN
  startRecording(): void {
    this.audioChunks = [];
    this.recordingTime = 0;

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      this.mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = event => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => {
        clearInterval(this.recordingInterval);

        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });

        this.selectedFile = audioFile;
        this.uploadResult = null;
        this.uploadError = false;
        this.isLoading = true;
        this.cdr.detectChanges();

        this.uploadAudio();
      };

      this.mediaRecorder.start();
      this.isRecording = true;

      this.recordingInterval = setInterval(() => {
        this.recordingTime++;
      }, 1000);
    }).catch(err => {
      console.error('❌ Microphone access denied:', err);
    });
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }
  }
}
