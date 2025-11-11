import { Component, AfterViewInit, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { Router, RouterModule } from '@angular/router';
import { PresentationService } from '../../services/presentation.service';
import { Presentation } from '../../models/presentation.model';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

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
    MatSnackBarModule,
    RouterModule
  ],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css']
})
export class HistoryComponent implements OnInit, AfterViewInit {

  constructor(
    private router: Router,
    private presentationService: PresentationService,
    private snackBar: MatSnackBar
  ) {}

  displayedColumns: string[] = ['presentation', 'date', 'emotion', 'action', 'listen', 'delete'];
  dataSource = new MatTableDataSource<any>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit(): void {
    this.presentationService.getPresentationSummaries().subscribe({
      next: (data: Presentation[]) => {
        const mapped = data.map(p => ({
          id: p.id,
          title: p.filename,
          date: this.formatDate(p.created_at),
          emotion: p.dominant_emotion,
          favorite: false // aún no implementado
        }));
        this.dataSource.data = mapped;
      },
      error: (err) => {
        console.error('Error fetching history presentations:', err);
      }
    });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  }

  // toggleFavorite(element: any): void {
  //   element.favorite = !element.favorite;
  // }

  goToFeedback(presentationId: string): void {
    this.router.navigate(['/design/feedback-config', presentationId]);
  }

  goToAudioPlayer(presentationId: string): void {
  this.router.navigate(['/audio-player', presentationId]);
}


  playAudio(audioUrl: string) {
    const audio = new Audio(audioUrl);
    audio.play();
  }

  downloadReport(pdfUrl: string) {
    window.open(pdfUrl, '_blank');
  }

  deletePresentation(id: string): void {
    this.presentationService.deletePresentation(id).subscribe({
      next: () => {
        this.dataSource.data = this.dataSource.data.filter(p => p.id !== id);
        this.snackBar.open('Presentation deleted successfully.', 'Close', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'bottom'
        });
      },
      error: (err) => {
        console.error('Error deleting presentation:', err);
        this.snackBar.open('Failed to delete presentation.', 'Close', {
          duration: 3000,
          panelClass: ['snackbar-error']
        });
      }
    });
  }
}
