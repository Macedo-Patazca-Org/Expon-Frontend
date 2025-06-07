import { Component, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { PresentationSummary } from '../../models/presentation-summary.model';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    RouterModule
  ],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css']
})

export class HistoryComponent implements AfterViewInit {
  constructor(private router: Router) {}

  displayedColumns: string[] = ['presentation', 'date', 'emotion', 'action', 'favorite'];

  dataSource = new MatTableDataSource<PresentationSummary>([
    { title: 'Presentation 1', date: '09/12/2025', emotion: 'Confidence', favorite: false },
    { title: 'Presentation 2', date: '09/12/2025', emotion: 'Confidence', favorite: true },
    { title: 'Presentation 3', date: '09/12/2025', emotion: 'Anxiety', favorite: false },
    { title: 'Presentation 4', date: '09/12/2025', emotion: 'Tension', favorite: false },
    { title: 'Presentation 5', date: '09/12/2025', emotion: 'Tension', favorite: true },
    { title: 'Presentation 6', date: '09/12/2025', emotion: 'Confidence', favorite: false },
    { title: 'Presentation 7', date: '09/12/2025', emotion: 'Confidence', favorite: false },
    { title: 'Presentation 8', date: '09/12/2025', emotion: 'Anxiety', favorite: true },
    { title: 'Presentation 9', date: '09/12/2025', emotion: 'Tension', favorite: false },
    { title: 'Presentation 10', date: '09/12/2025', emotion: 'Tension', favorite: true }
  ]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  playAudio(audioUrl: string) {
    const audio = new Audio(audioUrl);
    audio.play();
  }

  downloadReport(pdfUrl: string) {
    window.open(pdfUrl, '_blank');
  }

  toggleFavorite(element: any): void {
  element.favorite = !element.favorite;
}

goToFeedback(): void {
  this.router.navigate(['/design/feedback-config']);
}


}
