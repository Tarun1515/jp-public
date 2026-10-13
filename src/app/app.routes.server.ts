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
   * Phase 7A — the data pages.
   *
   * 🔴 THESE MUST BE LISTED, AND THE TRAP IS THAT OMITTING THEM LOOKS FINE.
   *
   * The `**` catch-all below is `RenderMode.Prerender`, and it would happily
   * catch these: /jobs would be rendered ONCE at build time — against whatever
   * jobs existed on the build machine, which is none — and that empty page
   * would be served to every visitor and every crawler, for ever. It would not
   * error. It would not warn. It would just be a job board with no jobs that
   * fills in after hydration.
   *
   * ⚠️ /jobs/:slug cannot be prerendered at all without a `getPrerenderParams`
   * that enumerates every job at build time — which would mean rebuilding the
   * site every time a school posts a vacancy.
   *
   * ⚠️ /faq joins them because 7A moved its copy into the database (2.81). It
   * was prerendered while the questions were a TypeScript array; an admin
   * editing a FAQ must not have to wait for a deploy to see it.
   */
  {
    path: 'jobs',
    renderMode: RenderMode.Server,
  },
  {
    path: 'jobs/:slug',
    renderMode: RenderMode.Server,
  },
  {
    path: 'faq',
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
