import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * 404.
 *
 * Not imported from `jp-shared/pages` — that would federate this app for the
 * sake of one page, and jp-public stays unfederated (HOW_TO_RUN §3.7). It is a
 * handful of markup and it needs public-site links, not app ones.
 */
@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section class="section">
      <div class="container prose">
        <p class="code">404</p>
        <h1>We cannot find that page</h1>
        <p>
          The link may be out of date, or the page may have moved. Nothing is wrong with your
          account.
        </p>
        <p>
          Try <a routerLink="/">the homepage</a>, read
          <a routerLink="/how-it-works">how it works</a>, or
          <a routerLink="/contact">tell us what you were looking for</a>.
        </p>
      </div>
    </section>
  `,
  styles: `
    .code {
      font-family: var(--jp-font-family-mono);
      font-size: var(--jp-font-size-sm);
      letter-spacing: 0.08em;
      color: var(--jp-text-muted);
      margin: 0 0 0.5rem;
    }
  `,
})
export class NotFoundComponent {}
