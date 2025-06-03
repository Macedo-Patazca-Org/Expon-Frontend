import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './profile-edit.component.html',
  styleUrls: ['./profile-edit.component.css']
})
export class ProfileEditComponent implements OnInit {
  profileForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      name: ['Luis'],
      lastname: ['Perez'],
      email: ['luis.perez@example.com'],
      password: [''],
      gender: ['Male'],
      picturePath: ['/assets/images/avatar-img.png'],
      preference: ['Formal']
    });
  }

  onSubmit(): void {
    if (this.profileForm.valid) {
      console.log('Updated user:', this.profileForm.value);
      // Aquí iría la lógica para guardar cambios
    }
  }
}
