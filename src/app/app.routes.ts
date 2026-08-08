import { Routes } from '@angular/router';

import { PageSeo } from './core/seo.service';

/**
 * Every route carries its own `seo` data — title and meta description. The
 * SeoService reads it on each navigation, including during server rendering,
 * so a crawler sees the right tags in the served HTML rather than after
 * hydration.
 *
 * 🔴 A new route without an `seo` entry logs a warning and keeps the previous
 * page's metadata. Add it in the same commit as the route.
 *
 * ⚠️ Job search, job detail, featured jobs and featured schools are NOT here.
 * They need data that does not exist until Phase 4, and building them against
 * mock data means building them twice.
 */
const seo = (title: string, description: string): { seo: PageSeo } => ({
  seo: { title, description },
});

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    data: seo(
      'Teaching jobs at verified schools',
      'Staffroom India connects teachers with schools that have been verified before their jobs go live. Find teaching work, or hire teachers who are actively looking.',
    ),
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'how-it-works',
    data: seo(
      'How it works',
      'What happens after you create an account, for teachers and for schools — from your first application or job post through to an offer.',
    ),
    loadComponent: () =>
      import('./pages/how-it-works/how-it-works.component').then((m) => m.HowItWorksComponent),
  },
  {
    path: 'about',
    data: seo(
      'About',
      'Why Staffroom India verifies every school before its jobs are published, and who the platform is built for.',
    ),
    loadComponent: () => import('./pages/about/about.component').then((m) => m.AboutComponent),
  },
  {
    path: 'contact',
    data: seo(
      'Contact',
      'Get in touch with Staffroom India about hiring, applying, or a problem with your account.',
    ),
    loadComponent: () => import('./pages/contact/contact.component').then((m) => m.ContactComponent),
  },
  {
    path: 'faq',
    data: seo(
      'Frequently asked questions',
      'Common questions from teachers and schools about accounts, verification, applications and hiring on Staffroom India.',
    ),
    loadComponent: () => import('./pages/faq/faq.component').then((m) => m.FaqComponent),
  },
  {
    path: 'terms',
    data: seo(
      'Terms of use',
      'The terms that govern the use of Staffroom India by teachers and schools.',
    ),
    loadComponent: () => import('./pages/terms/terms.component').then((m) => m.TermsComponent),
  },
  {
    path: 'privacy',
    data: seo(
      'Privacy policy',
      'What personal data Staffroom India collects, why it is collected, and how it is used and retained.',
    ),
    loadComponent: () => import('./pages/privacy/privacy.component').then((m) => m.PrivacyComponent),
  },

  /**
   * The audience chooser. `?mode=login` or `?mode=signup`.
   *
   * The only route here that is server-rendered rather than prerendered — see
   * app.routes.server.ts.
   */
  {
    path: 'continue',
    data: seo(
      'Continue',
      'Sign in or create an account on Staffroom India — as a school hiring teachers, or as a teacher looking for work.',
    ),
    loadComponent: () =>
      import('./pages/continue/continue.component').then((m) => m.ContinueComponent),
  },

  {
    path: '**',
    data: seo('Page not found', 'The page you were looking for does not exist, or it has moved.'),
    loadComponent: () =>
      import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
