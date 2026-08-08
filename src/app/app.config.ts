import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';
import { provideClientHydration } from '@angular/platform-browser';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    provideRouter(
      routes,

      /**
       * `withComponentInputBinding` maps route and query parameters onto
       * component inputs. `/continue` needs it: `mode` has to be resolved while
       * the server renders, so the right heading is in the HTML that is sent
       * rather than being corrected after hydration.
       */
      withComponentInputBinding(),

      /**
       * The footer links into sections of /how-it-works with a fragment
       * (`#teachers`, `#schools`). Without `anchorScrolling` the route changes
       * and the page stays where it was, which reads as a broken link.
       *
       * `scrollPositionRestoration: 'top'` is the other half: navigating from
       * halfway down one page to another must start at the top of the new one.
       */
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'top',
      }),
    ),

    provideClientHydration(),
  ],
};
