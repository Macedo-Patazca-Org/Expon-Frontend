import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  constructor(private router: Router) {}

  goToUpload(): void {
    this.router.navigate(['/presentations']);
  }

  presentations = [
    { title: 'Presentation 1', date: '7 days ago', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRKXnDh1nZ1ScINxL-E-cnu2K_2ECarrKNUEQ&s' },
    { title: 'Presentation 2', date: '5 days ago', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRpl-KaY1wpIxRmHLRO1KkzOOvyzO5aGd04akuA_TvBjyHvzKFvRKNSW3f1dF0jLqLNoBE&usqp=CAU' },
    { title: 'Presentation 3', date: '3 days ago', image: 'https://plantillaspowerpointymas.com/wp-content/uploads/ejemplos-tipos-de-presentaciones-empresariales-power-point.png' },
    { title: 'Presentation 4', date: '1 day ago', image: 'https://cdn.prod.website-files.com/63ca9a05fdc83042565f605c/66a23e2154e5e054fff4f169_outline_blog.jpg' }
  ];

  emotionSummary = {
    confidence: 60,
    anxiety: 30,
    enthusiasm: 10
  };

  ngOnInit(): void {
    const maxPerRow = Math.min(this.presentations.length, 4);
    document.documentElement.style.setProperty('--cards-per-row', maxPerRow.toString());
  }

  goToFeedbackConfig(): void {
  this.router.navigate(['/design/feedback-config']);
}
}
