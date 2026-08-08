import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { signUpUrl } from '../../core/portal-links';

interface Stage {
  readonly title: string;
  readonly body: string;
}

/**
 * The full journey, one section per audience.
 *
 * Both sections carry an `id` — the footer and the homepage link straight to
 * `#teachers` and `#schools`, so someone arriving from "For schools" lands on
 * the part that concerns them rather than at the top of a page about both.
 */
@Component({
  selector: 'app-how-it-works',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './how-it-works.component.html',
  styleUrl: './how-it-works.component.scss',
})
export class HowItWorksComponent {
  protected readonly teacherSignUpUrl = signUpUrl('teacher');
  protected readonly schoolSignUpUrl = signUpUrl('school');

  protected readonly teacherStages: readonly Stage[] = [
    {
      title: 'Create your account',
      body: 'Your email or mobile number, and a password. It takes a minute and costs nothing.',
    },
    {
      title: 'Fill in your profile once',
      body: 'Subjects you teach, the levels you are qualified for, your experience, and the cities you can work in. Schools see this when you apply, so you never retype it.',
    },
    {
      title: 'Find a job that fits',
      body: 'Search by subject, level and location. Every school listed has been verified, so you are not sorting real vacancies from fake ones.',
    },
    {
      title: 'Apply in one step',
      body: 'No separate form for each school, no attachments to re-upload, no phone call afterwards to check it arrived.',
    },
    {
      title: 'Follow it through the stages',
      body: 'Applied, viewed, shortlisted, interview, offer. You can see which stage you are at instead of guessing whether to keep waiting.',
    },
    {
      title: 'Get an answer',
      body: 'Schools respond through the platform, including when the answer is no. A decision you can see is more useful than silence.',
    },
  ];

  protected readonly schoolStages: readonly Stage[] = [
    {
      title: 'Register your school',
      body: 'The school details and the person who will manage hiring. One account to start; you can add colleagues later.',
    },
    {
      title: 'Get verified',
      body: 'We check that the school exists and that you are connected to it before your first vacancy is published. This happens once, not per job.',
    },
    {
      title: 'Post a vacancy',
      body: 'Subject, level, whether it is full time, and the terms you are offering. Being specific is what stops unsuitable applications arriving.',
    },
    {
      title: 'See applicants in one list',
      body: 'Everyone who applied on one screen, with their subjects and experience, rather than spread across an inbox.',
    },
    {
      title: 'Shortlist and interview',
      body: 'Move candidates through the stages. Everyone involved in the decision is looking at the same list.',
    },
    {
      title: 'Make an offer',
      body: 'Record the offer and the outcome, so the vacancy closes with a result attached instead of going quiet.',
    },
  ];
}
