import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ProfileService } from '../../../services/profile.service';
import { Profile } from '../../../models/profile.model';

@Component({
  selector: 'app-profile-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './profile-view.component.html',
  styleUrls: ['./profile-view.component.css']
})
export class ProfileViewComponent implements OnInit {
  profile: Profile | null = null;
  errorMessage = '';
  isLoading = true;

  constructor(
    private profileService: ProfileService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.profileService.getMyProfile().subscribe({
      next: (data) => {
        this.profile = data;
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;

        if (error.status === 404) {
          console.warn('Perfil no encontrado. Redirigiendo a creación...');
          this.router.navigate(['/profile/edit']);
        } else {
          console.error('Error al obtener el perfil:', error);
          this.errorMessage = 'No se pudo cargar el perfil del usuario.';
        }
      }
    });
  }
}
