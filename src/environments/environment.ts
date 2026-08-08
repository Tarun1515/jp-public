/**
 * Development environment for the public website.
 *
 * Replaced by environment.production.ts in a production build — see the
 * `fileReplacements` entry in angular.json.
 *
 * The public site has no login of its own. What it needs to know is where the
 * two signed-in applications live, so it can hand a visitor over to the right
 * one.
 */
export const environment = {
  production: false,

  /**
   * This site's own origin. Used for canonical URLs and Open Graph tags, which
   * must be absolute — a relative canonical is ignored, and a relative og:url
   * renders as a broken preview when a link is shared.
   */
  siteUrl: 'http://localhost:4500',

  /**
   * Where the contact form tells people to write until the enquiry endpoint
   * exists (Phase 7). Configured rather than inlined in the template so it
   * changes in one place when the real address is decided.
   */
  contactEmail: 'hello@staffroom.in',

  /**
   * Where each audience signs in.
   *
   * 🔴 Configured, not hardcoded, for the same reason as in the apps: a
   * production hostname baked into a local build sends a developer testing a
   * signup link straight into the live system.
   *
   * There is deliberately NO admin entry. Admin is internal — it is not
   * advertised, linked to, or named anywhere on a public page. Adding it here
   * would be the first step to it leaking into the markup.
   */
  appUrls: {
    school: 'http://localhost:4300',
    teacher: 'http://localhost:4400',
  },
};
