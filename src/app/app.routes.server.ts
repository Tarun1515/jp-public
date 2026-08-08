import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * 🔴 Prerender by default, server-render only where a page genuinely varies.
 *
 * These pages have no query parameters and no per-request content, so there is
 * nothing to compute per visit. Prerendering emits real HTML at build time:
 * a crawler and a first-time visitor both get the finished page with no server
 * work and no round trip.
 */
export const serverRoutes: ServerRoute[] = [
  /**
   * The exception. What `/continue` renders depends on the `mode` query
   * parameter, and a prerendered file is one fixed piece of HTML for every
   * query string — someone arriving at `?mode=signup` would be served
   * "Sign in" and watch it change after hydration.
   */
  {
    path: 'continue',
    renderMode: RenderMode.Server,
  },

  /**
   * The catch-all covers the static pages AND the not-found route. Angular
   * discovers the prerenderable routes from the router configuration, so a new
   * static page is prerendered automatically once it is added to app.routes.ts.
   */
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
