import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthRecoveryService } from '../../../core/services/auth-recovery.service';

@Component({
  selector: 'app-recover-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recover-password.component.html',
  styleUrls: ['./recover-password.component.css']
})
export class RecoverPasswordComponent implements OnInit {
  newPassword = '';
  confirmPassword = '';
  errorMessage = '';
  successMessage = '';
  ready = false;     // true si el enlace trae access_token válido
  saving = false;

  constructor(private rec: AuthRecoveryService) {}

  ngOnInit(): void {
    // Verifica si el enlace de correo trajo el token de recuperación
    this.ready = this.rec.hasRecoveryAccessToken();
    if (!this.ready) {
      this.errorMessage = 'Enlace inválido o expirado. Solicita nuevamente la recuperación.';
    }
  }

  async onSubmit(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.ready) return;

    if (!this.newPassword || !this.confirmPassword) {
      this.errorMessage = 'Por favor completa ambos campos.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }
    if (this.newPassword.length < 8) {
      this.errorMessage = 'La nueva contraseña debe tener al menos 8 caracteres.';
      return;
    }

    this.saving = true;
    try {
      // Actualiza la contraseña usando el access_token del hash (REST Supabase)
      await this.rec.updatePassword(this.newPassword);

      this.successMessage = '¡Contraseña actualizada correctamente! Ahora puedes iniciar sesión.';
      this.newPassword = '';
      this.confirmPassword = '';
    } catch (e: any) {
      this.errorMessage = e?.message ?? 'No se pudo actualizar la contraseña.';
    } finally {
      this.saving = false;
    }
  }
}
