import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../authentication/services/auth.service';
import { Profile } from '../../../user-profile/models/profile.model';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  templateUrl: './dashboard-layout.component.html',
  styleUrls: ['./dashboard-layout.component.css']
})
export class DashboardLayoutComponent implements OnInit {
  isCollapsed = false;
  currentUser: Profile | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
  this.isCollapsed = window.innerWidth < 1024;
  window.addEventListener('resize', () => {
    this.isCollapsed = window.innerWidth < 1024;
  });

  this.authService.getCurrentUser().subscribe({
    next: (user: any) => {
      // Adaptación temporal: asignar username a full_name
      this.currentUser = {
        ...user,
        full_name: user.username  // 👈 Esto llena el campo esperado sin romper el modelo
      };
    },
    error: (err) => {
      console.error('Error al obtener el usuario:', err);
    }
  });
}


  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  logout(): void {
    this.authService.logout();
    this.snackBar.open('Sesión cerrada exitosamente', 'Cerrar', {
      duration: 3000,
      panelClass: ['snackbar-success']
    });
    this.router.navigate(['/login']);
  }
  
}