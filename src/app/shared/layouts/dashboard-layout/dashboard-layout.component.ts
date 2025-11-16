import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../authentication/services/auth.service';
import { Profile } from '../../../user-profile/models/profile.model';
import { ProfileService } from '../../../user-profile/services/profile.service';

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
    private snackBar: MatSnackBar,
    private profileService: ProfileService
  ) {}

  ngOnInit(): void {
    this.isCollapsed = window.innerWidth < 1024;
    window.addEventListener('resize', () => {
      this.isCollapsed = window.innerWidth < 1024;
    });

    // 1. Obtener usuario autenticado (username, email, etc.)
    this.authService.getCurrentUser().subscribe({
      next: (user: any) => {
        // Base: al menos mostrar username
        const baseUser: any = {
          full_name: user.username,
          profile_picture: null
        };

        this.currentUser = baseUser;

        // 2. obtener perfil para sobreescribir full_name y foto
        this.profileService.getMyProfile().subscribe({
          next: (profile: Profile) => {
            this.currentUser = {
              ...baseUser,
              full_name: profile.full_name || baseUser.full_name,
              profile_picture: profile.profile_picture || null
            };
          },
          error: (err) => {
            // Si no hay perfil (404), solo con el username
            if (err.status !== 404) {
              console.error('Error al obtener el perfil en el layout:', err);
            }
          }
        });
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