import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs/operators';

import { environment } from '../../environments/environment';

/**
 * Per-route metadata. Declared as route `data` so a page's title and
 * description sit next to its route rather than inside the component — the
 * router already knows which page is showing, and this way a new route without
 * metadata is visible in one file instead of hidden in a component.
 */
export interface PageSeo {
  /** Without the site-name suffix; this service appends it. */
  readonly title: string;

  /** ~155 characters. Longer is truncated in results, shorter looks thin. */
  readonly description: string;
}

const SITE_NAME = 'Staffroom India';

const TITLE_SUFFIX = ` — ${SITE_NAME}`;

/**
 * The longest title worth setting, in characters.
 *
 * 🔴 65 BECAUSE scripts/verify/site-audit.mjs FAILS ABOVE IT, and that number
 * is itself the practical limit at which a search result truncates the title.
 * Both halves matter: a longer title is not an error, it is a title the reader
 * never finishes.
 *
 * ⚠️ Static page titles are written by hand and are comfortably inside this.
 * It exists for titles built from DATA — a job's own title plus its school's
 * name, neither of which has a length this project controls.
 */
export const TITLE_MAX_LENGTH = 65;

/**
 * How many characters a caller may spend before this service appends its
 * suffix.
 *
 * 🔴 EXPORTED SO A CALLER DOES NOT GUESS IT. The suffix is defined here; a
 * component computing "65 minus about eighteen" would be one edit of
 * SITE_NAME away from being silently wrong.
 */
export const titleBudget = (): number => TITLE_MAX_LENGTH - TITLE_SUFFIX.length;

/**
 * Applies title, description, Open Graph, Twitter card and canonical tags on
 * every navigation.
 *
 * 🔴 Runs during server rendering as well as in the browser. That is the whole
 * point — a crawler reads the served HTML, so metadata applied only after
 * hydration is metadata no search engine or link preview ever sees.
 *
 * Every URL emitted here is absolute, built from `environment.siteUrl`.
 * Relative canonicals are ignored, and a relative `og:url` produces a broken
 * preview card.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  /** Called once, from the root component. */
  init(): void {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        map(() => this.deepestRoute().snapshot.data['seo'] as PageSeo | undefined),
      )
      .subscribe((seo) => this.apply(seo));
  }

  /**
   * Set metadata from DATA rather than from route config. Phase 7A.
   *
   * 🔴 WHY A DATA PAGE CANNOT USE ROUTE `data`.
   *
   * A job detail page's title IS the job's title, which is not known until the
   * request returns. Route `data` is static, so /jobs/:slug would otherwise be
   * indexed as one generic "Job" page however many jobs exist — the single
   * worst SEO outcome available on a job board.
   *
   * ⚠️ CALL IT FROM THE SUBSCRIBE, NOT AFTER IT. Angular's SSR waits for
   * outstanding HttpClient requests before serialising the document, so a tag
   * set when the response arrives IS in the served HTML. One set in a
   * setTimeout, or after an await that is not tracked, is not — and the symptom
   * is a page that looks right in a browser and is blank to a crawler. 7A's
   * verification curls the SSR output and greps the title for exactly this.
   *
   * ⚠️ The `seo` route data for such a route still exists and is still used —
   * it is what the page is called while the data is loading, and what it falls
   * back to if the request fails.
   */
  setFromData(seo: PageSeo): void {
    this.apply(seo);
  }

  /**
   * Keep this page out of search results.
   *
   * 🔴 For the "job not found" state. The server answers 404 for a job that is
   * expired, closed, draft, deleted or pulled, but Angular's server renderer
   * returns HTTP 200 for the page it renders — so to a crawler this is a SOFT
   * 404: a real page with "not found" content, which search engines penalise
   * and may index.
   *
   * ⚠️ `noindex` is the mitigation, not the fix. The fix is a real 404 status,
   * which needs the renderer to be told — recorded honestly rather than left
   * looking solved. What this does guarantee is that an expired job does not
   * sit in an index inviting clicks to a dead page.
   */
  setNoIndex(): void {
    this.meta.updateTag({ name: 'robots', content: 'noindex, follow' }, "name='robots'");
  }

  /**
   * Remove a `noindex` left by a previous navigation.
   *
   * ⚠️ Needed because this is a single-page app: the tag is in one shared
   * document, so a visitor who lands on a missing job and then navigates to a
   * live one would carry the noindex with them. The crawler that matters fetches
   * each URL fresh — but the hydrated app is also what a headless renderer
   * sees, and a Lighthouse SEO audit run after that navigation would score it.
   */
  private clearNoIndex(): void {
    this.meta.removeTag("name='robots'");
  }

  private deepestRoute(): ActivatedRoute {
    let route = this.route;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route;
  }

  private apply(seo: PageSeo | undefined): void {
    if (!seo) {
      // A route with no metadata is a mistake, not a case to paper over with a
      // generic default — a page indexed under the wrong title is worse than
      // one that is obviously missing it.
      console.warn('[SeoService] route has no `seo` data; metadata not updated');
      return;
    }

    /*
      Every page that declares its own metadata is indexable; only the
      not-found states opt out, and they do it AFTER this runs.
    */
    this.clearNoIndex();

    const fullTitle = `${seo.title}${TITLE_SUFFIX}`;
    const url = this.absoluteUrl();

    this.title.setTitle(fullTitle);

    this.upsert([
      { name: 'description', content: seo.description },

      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:locale', content: 'en_IN' },
      { property: 'og:title', content: fullTitle },
      { property: 'og:description', content: seo.description },
      { property: 'og:url', content: url },

      /**
       * `summary`, not `summary_large_image` — there is no `og:image` yet.
       * Declaring the large-image card without an image produces a preview with
       * a blank panel where the picture should be, which looks worse than the
       * small card. Switch this to `summary_large_image` in the same change
       * that adds a real share image.
       */
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: fullTitle },
      { name: 'twitter:description', content: seo.description },
    ]);

    this.setCanonical(url);
  }

  private upsert(tags: { name?: string; property?: string; content: string }[]): void {
    for (const tag of tags) {
      // updateTag matches on the selector, so this replaces rather than
      // appending a second copy on the next navigation.
      const selector = tag.name ? `name='${tag.name}'` : `property='${tag.property}'`;
      this.meta.updateTag(tag, selector);
    }
  }

  /**
   * The canonical and og:url for the current route.
   *
   * Query parameters are dropped on purpose: `/continue?mode=login` and
   * `?mode=signup` are the same page to a crawler, and letting the parameter
   * through would split it into two competing URLs.
   */
  private absoluteUrl(): string {
    const path = this.router.url.split('?')[0].split('#')[0];
    return path === '/' ? environment.siteUrl : `${environment.siteUrl}${path}`;
  }

  private setCanonical(url: string): void {
    let link = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');

    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }

    link.setAttribute('href', url);
  }
}
