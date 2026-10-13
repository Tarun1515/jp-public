/**
 * Production environment for the public website.
 *
 * Hosts must match `Auth:PortalBaseUrls` in the API settings, which is what
 * builds the links inside invitation and password-reset emails. If these two
 * disagree, a visitor signs up on one host and is emailed a link to another.
 */
export const environment = {
  production: true,

  /**
   * ⚠️ Must match the domain the site is actually served from, and the one in
   * `public/sitemap.xml`. A canonical pointing at a host that does not serve
   * the page tells search engines to index nothing.
   */
  siteUrl: 'https://staffroom.in',

  /**
   * The App API. See the long note in environment.ts.
   *
   * 🔴 THIS IS THE BROWSER'S URL, AND SSR USES IT TOO — which works only while
   * the Node process can reach the public hostname. If it is deployed where it
   * cannot (a private network, or split DNS), server rendering fails on every
   * data page while the browser is fine, and the symptom is pages that render
   * empty for crawlers and correctly for people. That is the deployment
   * decision this file is waiting on; it is stated here rather than guessed.
   */
  apiUrl: 'https://api.staffroom.in/api',

  contactEmail: 'hello@staffroom.in',

  appUrls: {
    school: 'https://school.staffroom.in',
    teacher: 'https://teacher.staffroom.in',
  },
};
