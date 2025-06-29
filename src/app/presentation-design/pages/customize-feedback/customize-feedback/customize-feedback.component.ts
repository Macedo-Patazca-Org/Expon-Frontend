import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PresentationService } from '../../../../student-management/services/presentation.service';
import { CommonModule } from '@angular/common';

interface Feedback {
  general_feedback: string;
  confidence_feedback: string;
  anxiety_feedback: string;
  language_feedback: string;
  suggestions: string;
}

@Component({
  selector: 'app-customize-feedback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './customize-feedback.component.html',
  styleUrls: ['./customize-feedback.component.css']
})
export class CustomizeFeedbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private presentationService = inject(PresentationService);

  feedbackData: Feedback | null = null;
  loading: boolean = true;
  error: boolean = false;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.presentationService.getFeedbackByPresentationId(id).subscribe({
        next: (res: Feedback[]) => {
          if (res.length > 0) {
            this.feedbackData = res[0];
            console.log('📦 Feedback recibido:', this.feedbackData);
          } else {
            console.warn('⚠️ No se encontró feedback para esta presentación');
            this.error = true;
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('❌ Error al obtener feedback:', err);
          this.error = true;
          this.loading = false;
        }
      });
    } else {
      this.error = true;
      this.loading = false;
    }
  }
}
