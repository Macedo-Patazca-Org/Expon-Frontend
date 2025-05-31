import { Routes } from '@angular/router';

// Public pages
import { HomeComponent } from './public/pages/home/home/home.component';
import { AboutComponent } from './public/pages/about/about/about.component';

// Authentication
import { LoginComponent } from './authentication/pages/login/login/login.component';
import { RegisterComponent } from './authentication/pages/register/register/register.component';

// Subscriptions
import { CheckoutComponent } from './subscriptions/pages/checkout/checkout/checkout.component';
import { PlanSelectionComponent } from './subscriptions/pages/plan-selection/plan-selection/plan-selection.component';

// User Profile
import { ProfileViewComponent } from './user-profile/pages/profile-view/profile-view/profile-view.component';
import { ProfileEditComponent } from './user-profile/pages/profile-edit/profile-edit/profile-edit.component';

// Student Management
import { PresentationListComponent } from './student-management/pages/presentation-list/presentation-list/presentation-list.component';
import { UploadRecordingComponent } from './student-management/pages/upload-recording/upload-recording/upload-recording.component';

// Presentation Design
import { TemplateConfigComponent } from './presentation-design/pages/template-config/template-config/template-config.component';
import { CustomizeFeedbackComponent } from './presentation-design/pages/customize-feedback/customize-feedback/customize-feedback.component';

// Emotion Monitoring
import { LiveMonitoringComponent } from './emotion-monitoring/pages/live-monitoring/live-monitoring/live-monitoring.component';
import { EmotionTrackingComponent } from './emotion-monitoring/pages/emotion-tracking/emotion-tracking/emotion-tracking.component';

// Analytics
import { OverviewComponent } from './analytics/pages/overview/overview/overview.component';
import { UserProgressComponent } from './analytics/pages/user-progress/user-progress/user-progress.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'about', component: AboutComponent },

  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  { path: 'subscriptions/checkout', component: CheckoutComponent },
  { path: 'subscriptions/plans', component: PlanSelectionComponent },

  { path: 'profile', component: ProfileViewComponent },
  { path: 'profile/edit', component: ProfileEditComponent },

  { path: 'presentations', component: PresentationListComponent },
  { path: 'presentations/upload', component: UploadRecordingComponent },

  { path: 'design/template', component: TemplateConfigComponent },
  { path: 'design/feedback-config', component: CustomizeFeedbackComponent },

  { path: 'monitoring/live', component: LiveMonitoringComponent },
  { path: 'monitoring/emotion', component: EmotionTrackingComponent },

  { path: 'analytics/overview', component: OverviewComponent },
  { path: 'analytics/progress', component: UserProgressComponent },

  { path: '**', redirectTo: '' } // fallback route
];
