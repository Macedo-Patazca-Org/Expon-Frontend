import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  credentials = {
    email: '',
    password: ''
  };

  errorMessage: string = '';

  constructor(private authService: AuthService, private router: Router, private snackBar: MatSnackBar) {}

  onSubmit(): void {
  console.log('Enviando credenciales:', this.credentials);
  this.authService.login(this.credentials).subscribe({
    next: (response) => {
      this.authService.saveToken(response.access_token);
      this.snackBar.open('Inicio de sesión exitoso', 'Cerrar', {
        duration: 3000,
        panelClass: ['snackbar-success']
      });
      this.router.navigate(['/home']);
    },
    error: (error) => {
      const msg = error.error?.detail || 'Error al iniciar sesión';
      this.snackBar.open(msg, 'Cerrar', {
        duration: 4000,
        panelClass: ['snackbar-error']
      });
    }
  });
}

}
