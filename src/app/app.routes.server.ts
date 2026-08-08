import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  /**
   * Server-rendered, not prerendered: what this page says depends on the
   * `mode` query parameter, and a prerendered file is one fixed piece of HTML
   * for every query string. Someone arriving at `?mode=signup` would be served
   * "Sign in" and watch it change to "Create an account" after hydration.
   */
  {
    path: 'continue',
    renderMode: RenderMode.Server,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
