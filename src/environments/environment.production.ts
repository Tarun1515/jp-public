/**
 * Production environment for the public website.
 *
 * Hosts must match `Auth:PortalBaseUrls` in the API settings, which is what
 * builds the links inside invitation and password-reset emails. If these two
 * disagree, a visitor signs up on one host and is emailed a link to another.
 */
export const environment = {
  production: true,

  appUrls: {
    school: 'https://school.staffroom.in',
    teacher: 'https://teacher.staffroom.in',
  },
};
