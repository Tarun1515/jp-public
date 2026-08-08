import { Routes } from '@angular/router';

export const routes: Routes = [
  /**
   * The audience chooser. `?mode=login` or `?mode=signup`.
   *
   * The only public route that exists today. The marketing pages the header
   * and footer link to (home, jobs, for-schools, how-it-works, about,
   * contact, faq, terms, privacy) are Phase 4 and are built from the CMS
   * tables — those links currently resolve to nothing, which is accurate:
   * the pages have not been built.
   */
  {
    path: 'continue',
    title: 'Continue — Staffroom India',
    loadComponent: () =>
      import('./pages/continue/continue.component').then((m) => m.ContinueComponent),
  },
];
