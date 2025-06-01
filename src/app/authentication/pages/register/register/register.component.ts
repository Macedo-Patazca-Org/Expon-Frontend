import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  user = {
    username: '',
    email: '',
    password: ''
  };

  errorMessage: string = '';

  constructor(private authService: AuthService) {}

  onSubmit(): void {
    this.authService.register(this.user).subscribe({
      next: (response) => {
        console.log('Registro exitoso:', response);
        this.errorMessage = '';
        // Aquí podrías redirigir al login o al dashboard
      },
      error: (error) => {
        this.errorMessage = error.message;
      }
    });
  }
}
