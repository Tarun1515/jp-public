import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/*
  🔴 SECURITY HEADERS — PHASE 8A. There were none, on the only surface a
  stranger can reach without a token.

  ⚠️ FIRST, BEFORE THE STATIC HANDLER AND THE RENDERER, for the same reason
  the APIs put theirs first: a 404 from express.static and a 500 from the
  renderer are still responses this server sent.

  ----------------------------------------------------------------------------
  WHY THIS CSP IS NOT THE APIS' CSP
  ----------------------------------------------------------------------------
  The APIs serve JSON and can afford `default-src 'none'`. This serves real
  pages with real scripts, so the policy has to permit what the pages actually
  use — and anything it forbids that they DO use breaks the page silently in
  the browser, not loudly at startup.

  So it is built from what the site genuinely loads:

    script-src  'self'              — the Angular bundle, same origin. NO
                                      'unsafe-inline': the hydration payload
                                      is a JSON <script type="application/json">
                                      which is DATA, not script, and is not
                                      governed by script-src.
    style-src   'self' 'unsafe-inline'
                                    — ⚠️ the one concession, and it is
                                      Angular's: component styles and the
                                      [style.width.%] bindings this project
                                      uses emit inline style attributes.
                                      Removing it would need nonces threaded
                                      through SSR, which is a bigger change
                                      than 8A should make quietly.
    img-src     'self' data:        — data: because the design system inlines
                                      small icons.
    connect-src 'self' http://localhost:5299 http://localhost:5199
                                    — the two APIs the public site calls. In
                                      production these become the real API
                                      origins; they are listed, never '*'.
    frame-ancestors 'none'          — nothing frames this site.
    base-uri / object-src / form-action
                                    — locked down: the contact form posts
                                      through fetch, not a form action.

  🔴 EVERY DIRECTIVE BELOW WAS CORRECTED BY A BROWSER, NOT BY REASONING.

  The first version of this policy was written from what the site "obviously"
  loads. Loaded in Chromium against the real pages, it broke every one of them
  — four violations each, and the heading font came back 13px because the
  stylesheet never loaded. A CSP written from assumptions is a site outage with
  a security rationale.

  What the pages actually need, measured:

    base-uri 'self'          Angular emits <base href="/">. 'none' blocks it.
    style-src  + fonts.googleapis.com
    font-src   + fonts.gstatic.com
                             the type stack is Google-hosted. 'self' alone
                             leaves the site unstyled, which is the 13px.
    script-src 'unsafe-inline'
                             ⚠️ THE WEAK SPOT, NAMED. Angular's event replay
                             emits two INLINE scripts — the jsaction contract
                             and a per-page __jsaction_bootstrap call. Their
                             content varies by build and by page, so a hash
                             list would be stale on the next build.
    connect-src ws:          the dev server's HMR socket. Production drops it
                             (see JP_CSP_CONNECT).

  🔴 WHAT 'unsafe-inline' COSTS, SAID PLAINLY: it removes CSP's protection
  against injected inline script, which is the single thing a CSP is most
  valued for. Everything else still holds — no foreign script origin, no
  framing, no base-uri hijack, no object/embed, no form hijack, and img, font,
  style and connect are allowlisted rather than open.

  ⚠️ THE REAL FIX IS A PER-REQUEST NONCE (Angular's CSP_NONCE), threaded
  through the SSR engine, which lets the policy drop 'unsafe-inline' entirely.
  That is a change to how every request renders, with its own failure modes,
  and 8A is not the place to make it quietly: it is G47.

  ⚠️ NO upgrade-insecure-requests and NO HSTS here. This server runs on http in
  development; pinning a developer's browser to https for localhost is a
  self-inflicted outage. Both belong to the reverse proxy in production (8B).
*/
const CONNECT_SRC = process.env['JP_CSP_CONNECT']
  ?? "'self' http://localhost:5299 http://localhost:5199 ws://localhost:4500";

const STYLE_SRC = process.env['JP_CSP_STYLE']
  ?? "'self' 'unsafe-inline' https://fonts.googleapis.com";

const FONT_SRC = process.env['JP_CSP_FONT']
  ?? "'self' https://fonts.gstatic.com";

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",

      /* ⚠️ See the note above: this is the one directive that is not strict. */
      "script-src 'self' 'unsafe-inline'",

      `style-src ${STYLE_SRC}`,
      "img-src 'self' data:",
      `font-src ${FONT_SRC}`,
      `connect-src ${CONNECT_SRC}`,
      "frame-ancestors 'none'",

      /* Angular's <base href> needs 'self'; 'none' blocked the document. */
      "base-uri 'self'",
      "object-src 'none'",

      /* The contact form posts through fetch, never a form action. */
      "form-action 'none'",
    ].join('; '),
  );

  next();
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
