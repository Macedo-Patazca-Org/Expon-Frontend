import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { authInterceptorProvider } from './app/core/interceptors/auth.interceptor'; 

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [...appConfig.providers, authInterceptorProvider] 
}).catch((err) => console.error(err));
