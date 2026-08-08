import { environment } from '../../environments/environment';

/**
 * The two audiences the public site can hand a visitor over to.
 *
 * 🔴 There is no `'admin'` member, and adding one is a product decision, not a
 * typing convenience. Admin is internal: it is not advertised, linked to, or
 * named on any public page. Because the type is closed, a page CANNOT link to
 * the admin app by accident — it would not compile.
 */
export type Audience = 'school' | 'teacher';

/**
 * Sign in or sign up. Carried in the `mode` query parameter of `/continue` so
 * the chooser can label its two options for what the visitor is actually
 * doing, and so the destination lands on the matching screen.
 */
export type AuthMode = 'login' | 'signup';

export const AUTH_MODES: readonly AuthMode[] = ['login', 'signup'] as const;

/** Anything that is not a mode we know about is treated as a sign-in. */
export function parseAuthMode(value: string | null | undefined): AuthMode {
  return value === 'signup' ? 'signup' : 'login';
}

/**
 * Builds absolute URLs into the school and teacher applications.
 *
 * 🔴 This is the ONLY place in jp-public that may compose a portal URL. Hosts
 * come from `environment.appUrls`; nothing here or anywhere else on the public
 * site writes a hostname literally. The apps move to real subdomains at
 * deployment and a hardcoded host in a local build would send a developer
 * testing a signup link straight into production.
 *
 * Plain functions rather than an injectable service: there is no state and no
 * dependency, and the header, the homepage and the job pages all need it —
 * including from template bindings during server-side rendering.
 */

function baseUrl(audience: Audience): string {
  return environment.appUrls[audience];
}

/**
 * `/login` or `/signup` in the app for this audience.
 *
 * `redirectTo` is passed through as `?redirect=` and is an app-relative path —
 * never an absolute URL. The receiving app is expected to reject anything that
 * is not a path, because an open redirect is exactly how a phishing link gets
 * to look like it came from us.
 */
/**
 * The apps' real route paths.
 *
 * ⚠️ Not derivable from `mode`: both apps route auth under `/auth`, and the
 * signup route is called `register`, not `signup`. Building the path from the
 * mode name produces `/login` and `/signup`, which both resolve to the apps'
 * 404 page — a broken link that still looks plausible in the markup.
 */
const AUTH_PATHS: Readonly<Record<AuthMode, string>> = {
  login: '/auth/login',
  signup: '/auth/register',
};

export function authUrl(audience: Audience, mode: AuthMode, redirectTo?: string): string {
  const url = `${baseUrl(audience)}${AUTH_PATHS[mode]}`;

  if (!redirectTo) {
    return url;
  }

  return `${url}?redirect=${encodeURIComponent(redirectTo)}`;
}

/** Convenience wrappers, so call sites read as what they do. */
export function signInUrl(audience: Audience, redirectTo?: string): string {
  return authUrl(audience, 'login', redirectTo);
}

export function signUpUrl(audience: Audience, redirectTo?: string): string {
  return authUrl(audience, 'signup', redirectTo);
}

/**
 * "Apply" on a job page.
 *
 * Always the teacher app, always signup: someone reading a job advert on the
 * public site and pressing Apply does not have an account yet in the common
 * case, and the teacher app is responsible for offering "already registered?"
 * on its own signup screen. Sending them to a chooser first would be asking a
 * question they have already answered by being on a job page.
 *
 * The job travels as a redirect target so the application resumes where they
 * left off instead of dropping them on a dashboard.
 */
export function applyToJobUrl(jobSlug: string): string {
  return signUpUrl('teacher', `/jobs/${jobSlug}/apply`);
}
