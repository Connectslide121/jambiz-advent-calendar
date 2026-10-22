import { ApplicationConfig, provideZoneChangeDetection, provideAppInitializer, inject } from '@angular/core';
import { BackendService } from './services/backend.service';
import { CalendarStateService } from './services/calendar-state.service';
import { provideHttpClient } from '@angular/common/http';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

export function HttpLoaderFactory(http: HttpClient) {
  // GitHub Pages caches stable asset URLs; keep returning visitors on this release's text.
  return new TranslateHttpLoader(http, './assets/i18n/', '.json?v=2026-10-22-packing');
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(async () => {
      const backend = inject(BackendService);
      const state = inject(CalendarStateService);
      await backend.initialize();
      state.loadCloudProgress();
      await state.restoreDevPreferences();
    }),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(),
    provideTranslateService({
      defaultLanguage: 'sv',
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
  ],
};
