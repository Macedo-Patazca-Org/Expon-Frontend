import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

// Angular Material modules
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';

// Servicios y modelos
import { PresentationService } from '../../services/presentation.service';
import { AudioUploadResponse } from '../../models/audio-response.model';


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
    MatFormFieldModule
  ],
  templateUrl: './presentation.component.html',
  styleUrls: ['./presentation.component.css'],
  providers: [PresentationService]
})
export class PresentationComponent {
  selectedPurpose: string = '';
  selectedFile: File | null = null;
  uploadResult?: AudioUploadResponse;

  constructor(private presentationService: PresentationService) {}

  resetPurpose() {
    this.selectedPurpose = '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.uploadAudio(); // si deseas que se suba automáticamente
    }
  }

  uploadAudio(): void {
    if (!this.selectedFile) return;

    this.presentationService.uploadAudio(this.selectedFile).subscribe({
      next: (res) => {
        this.uploadResult = res;
        console.log('Audio uploaded successfully:', res);
      },
      error: (err) => {
        console.error('Upload failed:', err);
      }
    });
  }
}
