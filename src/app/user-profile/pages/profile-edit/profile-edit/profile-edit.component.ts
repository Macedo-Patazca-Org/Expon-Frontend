import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProfileService } from '../../../services/profile.service';
import { Profile } from '../../../models/profile.model';
import { supabase } from '../../../../lib/supabase-client';

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
  uploading: boolean = false;
  
  constructor(private fb: FormBuilder, private profileService: ProfileService, private router: Router) {}

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
          next: () => {
            console.log('Perfil actualizado con éxito');
            this.router.navigate(['/profile']);
          },
          error: (err) => console.error('Error al actualizar perfil:', err)
        });
      } else {
        this.profileService.createProfile(this.profileForm.value).subscribe({
          next: () => {
            console.log('Perfil creado con éxito');
            this.profileExists = true;
            this.router.navigate(['/profile']);
          },
          error: (err) => console.error('Error al crear perfil:', err)
        });
      }
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.uploading = true;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`; // carpeta dentro del bucket "avatars"

      // 1. Subir archivo a Supabase Storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (error) {
        console.error('Error al subir imagen a Supabase:', error);
        return;
      }

      // 2. Obtener URL pública
      const { data: publicData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = publicData.publicUrl;

      // 3. Guardar URL en el formulario (profile_picture es string)
      this.profileForm.patchValue({
        profile_picture: publicUrl
      });

      console.log('Imagen subida. URL:', publicUrl);
    } catch (err) {
      console.error('Error inesperado al subir imagen:', err);
    } finally {
      this.uploading = false;
    }
  }
}

