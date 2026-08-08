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

  contactEmail: 'hello@staffroom.in',

  appUrls: {
    school: 'https://school.staffroom.in',
    teacher: 'https://teacher.staffroom.in',
  },
};
