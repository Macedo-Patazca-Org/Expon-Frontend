import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthRecoveryService } from '../../../core/services/auth-recovery.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})

export class ForgotPasswordComponent {
  email = '';
  sending = false;
  done = false;
  error = '';

  constructor(private rec: AuthRecoveryService) {}

  async onSubmit() {
    this.error = '';
    this.sending = true;
    try {
      await this.rec.ensureAuthMirror(this.email);
      await this.rec.sendResetEmail(this.email);
      this.done = true; // Mensaje genérico (anti-enumeración)
    } catch {
      this.error = 'No se pudo procesar la solicitud ahora.';
    } finally {
      this.sending = false;
    }
  }
}
