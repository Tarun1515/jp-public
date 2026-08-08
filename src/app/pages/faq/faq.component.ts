import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Qa {
  readonly q: string;
  readonly a: string;
}

/**
 * FAQ, split by audience so the footer can link straight to the half that
 * applies (`#teachers`, `#schools`).
 *
 * Answers are written to be true today, not aspirational. Where a feature is
 * not built yet the answer says so — a FAQ that describes the product you
 * intend to have is the first thing a user catches you on.
 */
@Component({
  selector: 'app-faq',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.scss',
})
export class FaqComponent {
  protected readonly teacherQuestions: readonly Qa[] = [
    {
      q: 'Does it cost anything?',
      a: 'No. Creating a profile and applying for jobs is free for teachers, and there is no paid tier that moves your application up a list.',
    },
    {
      q: 'What can a school see about me?',
      a: 'The profile you filled in — your subjects, levels, experience and preferred locations — and the fact that you applied. Schools you have not applied to cannot see your application history.',
    },
    {
      q: 'What does "verified school" actually mean?',
      a: 'Before a school can publish a vacancy, we confirm the school exists and that the person posting is connected to it. It does not mean we have inspected the school or endorse it as an employer.',
    },
    {
      q: 'How do I know if my application was read?',
      a: 'Every application shows a stage — applied, viewed, shortlisted, interview, offer. When a school moves you, the stage changes, including when the outcome is a rejection.',
    },
    {
      q: 'Can I apply for more than one job at the same school?',
      a: 'Yes. Each vacancy is a separate application and is treated separately.',
    },
    {
      q: 'Can I search for jobs without an account?',
      a: 'Not yet. Public job search is being built and will arrive in a later release. For now, create a profile and you will be ready to apply as soon as listings are live.',
    },
  ];

  protected readonly schoolQuestions: readonly Qa[] = [
    {
      q: 'What does verification involve?',
      a: 'We check that the school exists and that the person registering is connected to it. It happens once, before your first vacancy is published, and not again for each job you post.',
    },
    {
      q: 'How long does verification take?',
      a: 'It is a manual review, so it is not instant. You can fill in your school profile and prepare a vacancy while it is in progress — the job simply will not be visible to teachers until the review is done.',
    },
    {
      q: 'Can more than one person from my school use the account?',
      a: 'Yes. The person who registers can invite colleagues, and what each of them can do depends on the role they are given — not everyone needs to be able to post jobs or make offers.',
    },
    {
      q: 'Can we manage more than one branch?',
      a: 'Yes. Branches sit under one school, and a vacancy belongs to a specific branch, so applicants know where the job actually is.',
    },
    {
      q: 'What does it cost?',
      a: 'Pricing is not finalised. If you are registering now, talk to us first so there are no surprises later.',
    },
    {
      q: 'Do you write the job advert for us?',
      a: 'No. You describe the subject, level and terms. Being specific is what stops unsuitable applications arriving, and nobody knows the role better than the school.',
    },
  ];
}
