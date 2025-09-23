import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PresentationService } from '../../services/presentation.service';
import { Presentation } from '../../models/presentation.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  constructor(
    private router: Router,
    private presentationService: PresentationService
  ) {}

  presentations: { id: string; title: string; date: string; image: string }[] = [];
  emotionSummary: { [key: string]: number } = {};

  ngOnInit(): void {
    this.presentationService.getPresentationSummaries().subscribe({
      next: (data: Presentation[]) => {
        this.presentations = data.map(p => ({
          id: p.id,
          title: p.filename,
          date: this.timeAgo(p.created_at),
          image: 'https://cdn.prod.website-files.com/63ca9a05fdc83042565f605c/66a23e2154e5e054fff4f169_outline_blog.jpg'
        }));

        const emotionCounts: { [key: string]: number } = {};
        data.forEach(p => {
          const emotion = p.dominant_emotion;
          emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
        });

        const total = data.length || 1;
        for (let emotion in emotionCounts) {
          this.emotionSummary[emotion] = Math.round((emotionCounts[emotion] / total) * 100);
        }

        const maxPerRow = Math.min(this.presentations.length, 4);
        document.documentElement.style.setProperty('--cards-per-row', maxPerRow.toString());
      },
      error: (err) => {
        console.error('Error loading presentations:', err);
      }
    });
  }

  timeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return '1 day ago';
    return `${diff} days ago`;
  }

  goToUpload(): void {
    this.router.navigate(['/presentations']);
  }

  goToFeedbackConfig(id: string): void {
    this.router.navigate(['/design/feedback-config', id]);
  }

}
