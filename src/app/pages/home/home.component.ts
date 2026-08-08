import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

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
  protected readonly teacherSignUpUrl = signUpUrl('teacher');
  protected readonly schoolSignUpUrl = signUpUrl('school');

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
