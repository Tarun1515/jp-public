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

/*
  🔴 THE PARAMETER IS `returnUrl`, AND IT USED TO BE `redirect` (7B-0).

  It was renamed because `returnUrl` already existed on the other side and
  `redirect` never did. jp-shared's auth guard and its session-expiry
  interceptor both write `?returnUrl=` — and until 7B-0 nothing anywhere read
  one, in any of the three apps. Measured: three hits across four repositories,
  every one a write.

  So there were two half-built mechanisms for one job. Completing the one with
  two live emitters and renaming the one with none was the cheaper direction,
  and it closed a second hole on the way: a teacher whose session expired
  halfway through an application now returns to it instead of landing on the
  dashboard.

  ⚠️ Two names for one thing would have been worse than either — the receiving
  screen would read both, and which won would be a coin toss nobody documented.

  🔒 The receiving app VALIDATES it (jp-shared `safeInternalPath`): an
  app-relative path only, never an absolute or protocol-relative URL. That
  check is the reason this is safe to emit at all, and it lives there rather
  than here because this side cannot enforce anything about what the other
  side does with a URL.
*/
export function authUrl(audience: Audience, mode: AuthMode, returnUrl?: string): string {
  const url = `${baseUrl(audience)}${AUTH_PATHS[mode]}`;

  if (!returnUrl) {
    return url;
  }

  return `${url}?returnUrl=${encodeURIComponent(returnUrl)}`;
}

/** Convenience wrappers, so call sites read as what they do. */
export function signInUrl(audience: Audience, returnUrl?: string): string {
  return authUrl(audience, 'login', returnUrl);
}

export function signUpUrl(audience: Audience, returnUrl?: string): string {
  return authUrl(audience, 'signup', returnUrl);
}

/**
 * "Apply" on a job page. Always the teacher app, always signup, and the job
 * travels with it.
 *
 * Someone reading a job advert and pressing Apply does not have an account yet
 * in the common case, and the teacher app offers "already registered?" on its
 * own signup screen. Sending them to the chooser first would ask a question
 * they answered by being on a job page — which is 2.43's reasoning, and what
 * 7A-0.0 confirmed when the brief's citation pointed the other way.
 *
 * ---------------------------------------------------------------------------
 * 🔴 THE JOB TRAVELS AGAIN — AND IT DID NOT, FOR ONE PHASE (G41, CLOSED 7B-0)
 * ---------------------------------------------------------------------------
 * 2.44 wrote this function ahead of the pages that would call it. 7A became
 * its first caller and found THREE things missing on the other side, so the
 * parameter was removed rather than left to be silently dropped:
 *
 *   1. jp-teacher read no redirect parameter anywhere. Only reset-password
 *      read a query parameter at all (its `token`).
 *   2. There was no `jobs/:id/apply` route to land on.
 *   3. `jobs/:jobId` did `Number(params.get('jobId'))` — an INTEGER, which
 *      the public surface deliberately never exposes (2.47), and
 *      public-contract.mjs's key allowlist FAILS on a `"jobId"` key.
 *
 * 7B-0 built all three: ReturnUrlService reads and validates the parameter,
 * `jobs/:jobUid/apply` resolves a job by uid through the same procedure and
 * the same WHERE clause as the id route, and this function is its caller
 * again.
 *
 * ⚠️ THE UID, NOT THE SLUG. The slug's leading words are decoration for a
 * reader; the teacher app looks the job up by uid and has no use for them.
 * Sending the slug would mean a second place that has to know how to strip a
 * uid off the end of one.
 *
 * 🔒 The receiving app validates the path before using it. Nothing here can
 * enforce that, which is exactly why it is enforced there.
 */
export function applyToJobUrl(jobUid: string): string {
  return signUpUrl('teacher', `/jobs/${jobUid}/apply`);
}
