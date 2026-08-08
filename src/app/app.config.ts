import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideClientHydration } from '@angular/platform-browser';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    /**
     * `withComponentInputBinding` maps route and query parameters onto component
     * inputs. `/continue` needs it: `mode` has to be resolved while the server
     * renders, so the right heading is in the HTML that is sent rather than
     * being corrected after hydration.
     */
    provideRouter(routes, withComponentInputBinding()),

    provideClientHydration(),
  ],
};
