import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/** Construye la base URL de Edge Functions a partir del Project URL de Supabase */
function functionsBaseUrl(projectUrl: string) {
  const u = new URL(projectUrl); // ej: https://<ref>.supabase.co
  const host = u.hostname.replace('.supabase.co', '.functions.supabase.co');
  return `${u.protocol}//${host}`; // https://<ref>.functions.supabase.co
}

/** Lee un parámetro del hash (#) de la URL (p.ej. access_token) */
function getHashParam(name: string): string | null {
  const m = new RegExp(`${name}=([^&]+)`).exec(location.hash);
  return m ? decodeURIComponent(m[1]) : null;
}

@Injectable({ providedIn: 'root' })
export class AuthRecoveryService {
  private readonly projectUrl = environment.supaProjectUrl;   // https://<ref>.supabase.co
  private readonly anonKey = environment.supaAnonKey;         // anon public key
  private readonly fnBase = functionsBaseUrl(this.projectUrl); // https://<ref>.functions.supabase.co

  /**
   * 1) Asegura que exista un "espejo" en auth.users para el email (Edge Function).
   * Respuesta siempre genérica para evitar user-enumeration.
   */
  async ensureAuthMirror(email: string): Promise<void> {
    await fetch(`${this.fnBase}/ensure-auth-mirror`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.anonKey,
      },
      body: JSON.stringify({ email }),
    });
  }

  /**
   * 2) Solicita a Supabase que envíe el correo de recuperación (Auth REST).
   * Usa la URL de retorno de producción (Netlify).
   */
    async sendResetEmail(email: string): Promise<void> {
    // Usa el origen donde se está ejecutando la app (localhost o Netlify)
    const redirectTo = `${location.origin}/recover-password`;

    await fetch(`${this.projectUrl}/auth/v1/recover`, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        'apikey': this.anonKey
        },
        body: JSON.stringify({ email, redirect_to: redirectTo }),
    });
    }

  /** 3) Indica si la URL actual trae un token de recuperación válido en el hash */
  hasRecoveryAccessToken(): boolean {
    return !!getHashParam('access_token');
  }

  /**
   * 4) Actualiza la contraseña en Supabase usando el access_token del hash
   *    (PATCH /auth/v1/user). El trigger copiará el hash a public.users.
   */
    async updatePassword(newPassword: string): Promise<void> {
    const accessToken = getHashParam('access_token');
    if (!accessToken) throw new Error('Enlace inválido o expirado');

    const res = await fetch(`${this.projectUrl}/auth/v1/user`, {
        method: 'PUT',
        headers: {
        'Content-Type': 'application/json',
        'apikey': this.anonKey,
        'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ password: newPassword }),
    });

    if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message ?? 'No se pudo actualizar la contraseña');
    }

    // Limpia el token del hash por seguridad
    history.replaceState({}, document.title, location.pathname);
    }
}
