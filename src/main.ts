import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { authInterceptorProvider } from './app/core/interceptors/auth.interceptor';

// --- Redirección temprana del hash de Supabase (recovery) ---
(function redirectSupabaseHash() {
  if (typeof window === 'undefined') return;
  const h = window.location.hash || '';
  const isRecovery = h.includes('type=recovery') || h.includes('access_token');
  if (isRecovery && !window.location.pathname.endsWith('/recover-password')) {
    window.location.replace('/recover-password' + h);
  }
})();

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [...appConfig.providers, authInterceptorProvider]
}).catch((err) => console.error(err));