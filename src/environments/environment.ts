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
   * The App API, which from Phase 7A this site reads for job listings, job
   * detail, FAQ copy and content blocks, and writes to for the contact form.
   *
   * 🔴 THE FIRST TIME THE PUBLIC SITE TALKS TO THE BACKEND AT ALL. Until 7A it
   * was a static brochure that only linked away to the two apps.
   *
   * ⚠️ ONE URL FOR BOTH THE SERVER AND THE BROWSER, and that is a choice worth
   * knowing about. These pages are server-rendered, so the SAME request is
   * made twice in different places: once by Node during SSR, once by the
   * browser if it needs fresh data. In this local setup both can reach
   * localhost:5299, so one value does.
   *
   * In a real deployment they diverge — Node would use an internal address
   * (http://api:8080) and the browser the public one (https://api.staffroom.in)
   * — and that needs two values plus a platform check, NOT one value that
   * happens to work from one side. It is not invented here because this project
   * has made no deployment-topology decision yet, and a guessed internal
   * hostname is a config line that is wrong in a way nothing catches until
   * production. See environment.production.ts.
   */
  apiUrl: 'http://localhost:5299/api',

  /**
   * The address shown on /contact beside the form.
   *
   * ⚠️ 7A wired the form to a real endpoint, so this is no longer the ONLY way
   * to reach us — but it stays, and is still offered when a submission fails.
   * A form that cannot submit and gives no alternative loses the enquiry.
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
