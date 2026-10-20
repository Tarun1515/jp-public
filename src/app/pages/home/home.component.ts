import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicApiService, PublicContentBlock } from '../../core/public-api.service';
import { signUpUrl } from '../../core/portal-links';

interface Step {
  readonly title: string;
  readonly detail: string;
}

/**
 * Homepage.
 *
 * 🔴 The two hero calls to action skip `/continue` on purpose. Someone who
 * presses "Find teaching jobs" has already told us which side they are on;
 * putting a chooser in front of them is asking a question they just answered.
 * The header's Sign in / Sign up go to the chooser, because a header click
 * says nothing about who is clicking.
 *
 * ⚠️ No statistics anywhere on this page, and none are to be added until they
 * are real. "10,000+ teachers" on a product with no users is the fastest way
 * to lose a client's trust in a demo, and it has to come out again later.
 */
@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly api = inject(PublicApiService);

  protected readonly teacherSignUpUrl = signUpUrl('teacher');
  protected readonly schoolSignUpUrl = signUpUrl('school');

  /**
   * 🔴 THE CMS BLOCKS' ONE CONSUMER — G44, CLOSED IN PHASE 8-0.
   *
   * `GET /api/public/content-blocks` and the admin editor behind it both
   * shipped in 7B, and nothing on the public site rendered a single block. The
   * admin screen said so in a banner, which was honest and is not a place to
   * leave a feature.
   *
   * ⚠️ FETCHED IN THE BROWSER, AFTER HYDRATION — and that is 2.81's own
   * decision for this page, made for the featured band: the homepage is the
   * most-hit page on the site and `app.routes.server.ts` PRERENDERS it, so a
   * block read at render time would be baked at build time and an admin's edit
   * would need a redeploy to appear. Read client-side, an edit shows up on the
   * next page load.
   *
   * ⚠️ WHICH MEANS THE CONTENT IS NOT IN THE SERVER HTML, deliberately. These
   * are notices, not the page's substance: the hero, the two journeys and the
   * verification argument stay in the template where they are reviewed, and
   * nothing a search engine needs depends on this fetch.
   *
   * 🔴 THE KEY IS STILL THE CONTRACT. Only keys beginning `HOME_` render
   * here; anything else is stored and rendered nowhere, which the admin screen
   * now states exactly rather than claiming nothing renders at all.
   */
  protected readonly notices = signal<readonly PublicContentBlock[]>([]);

  constructor() {
    /*
      ⚠️ Guarded rather than unconditional. On the prerender pass there is no
      API to call and no browser to show the result in; an unguarded fetch
      would make every build depend on a running App API.
    */
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      this.api.getContentBlocks().subscribe({
        next: (blocks) => this.notices.set(
          blocks
            .filter((b) => b.blockKey.startsWith('HOME_'))
            .slice()
            .sort((a, b) => a.displayOrder - b.displayOrder),
        ),

        /*
          ⚠️ A failed read leaves the band ABSENT, not broken. These are
          supplementary notices; an error box where a notice might have been
          tells a visitor about our API instead of about teaching jobs.
        */
        error: () => this.notices.set([]),
      });
    }
  }

  protected readonly teacherSteps: readonly Step[] = [
    {
      title: 'Build your profile once',
      detail: 'Subjects, levels, experience and where you can teach. You write it a single time.',
    },
    {
      title: 'Apply without chasing',
      detail: 'One step per job. No separate form, no follow-up call to ask if it arrived.',
    },
    {
      title: 'See where you stand',
      detail: 'Every application shows its stage, so you know whether to keep waiting.',
    },
  ];

  protected readonly schoolSteps: readonly Step[] = [
    {
      title: 'Get your school verified',
      detail: 'A one-time check before your first vacancy is published.',
    },
    {
      title: 'Post what you actually need',
      detail: 'Subject, level, and the terms — so the people who apply already fit.',
    },
    {
      title: 'Shortlist on one screen',
      detail: 'Every applicant in one list, moved through stages until someone is hired.',
    },
  ];
}
