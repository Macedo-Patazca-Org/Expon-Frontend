import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router'; 
import { MatSnackBar } from '@angular/material/snack-bar';

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

  constructor(private authService: AuthService, private router: Router, private snackBar: MatSnackBar) {} 

  onSubmit(): void {
  this.authService.register(this.user).subscribe({
    next: (response) => {
      this.snackBar.open('Registro exitoso. ¡Bienvenido!', 'Cerrar', {
        duration: 3000,
        panelClass: ['snackbar-success']
      });
      this.router.navigate(['/login']);
    },
    error: (error) => {
      const msg = error.error?.detail || 'Error al registrarse.';
      this.snackBar.open(msg, 'Cerrar', {
        duration: 4000,
        panelClass: ['snackbar-error']
      });
    }
  });
}

}
