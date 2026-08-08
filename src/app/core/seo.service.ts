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

    const fullTitle = `${seo.title} — ${SITE_NAME}`;
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
