import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProfileService } from '../../../services/profile.service';
import { Profile } from '../../../models/profile.model';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './profile-edit.component.html',
  styleUrls: ['./profile-edit.component.css']
})

export class ProfileEditComponent implements OnInit {
  profileForm!: FormGroup;
  profileExists = false; // Variable para marcar si el perfil existe o no

  constructor(private fb: FormBuilder, private profileService: ProfileService) {}

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      full_name: [''],
      university: [''],
      career: [''],
      first_name: [''],
      last_name: [''],
      gender: [''],
      profile_picture: [''],
      preferred_presentation: ['']
    });

    this.profileService.getMyProfile().subscribe({
      next: (profile: Profile) => {
        this.profileExists = true; // marcar que existe
        this.profileForm.patchValue(profile);
      },
      error: (err) => {
        if (err.status === 404) {
          console.warn('Perfil no encontrado. Se puede crear uno nuevo.');
          this.profileExists = false; // marcar que no existe
        } else {
          console.error('Error al obtener el perfil:', err);
        }
      }
    });
  }

  onSubmit(): void {
    if (this.profileForm.valid) {
      if (this.profileExists) {
        this.profileService.updateProfile(this.profileForm.value).subscribe({
          next: () => console.log('Perfil actualizado con éxito'),
          error: (err) => console.error('Error al actualizar perfil:', err)
        });
      } else {
        this.profileService.createProfile(this.profileForm.value).subscribe({
          next: () => {
            console.log('Perfil creado con éxito');
            this.profileExists = true; // actualizar estado interno
          },
          error: (err) => console.error('Error al crear perfil:', err)
        });
      }
    }
  }
}

