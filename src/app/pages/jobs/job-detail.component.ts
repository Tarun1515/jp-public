import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

import { PublicApiService, PublicJobDetail, uidFromSlug } from '../../core/public-api.service';
import { SeoService, titleBudget } from '../../core/seo.service';
import { applyAsTeacherUrl } from '../../core/portal-links';

/**
 * One public job, with the school's public face. Phase 7A.
 *
 * ---------------------------------------------------------------------------
 * 🔴 FOUR OUTCOMES, AND THEY ARE NOT THE SAME THING
 * ---------------------------------------------------------------------------
 *   loading  — the request is out
 *   found    — render it
 *   missing  — the server said 404: draft, expired, closed, deleted, or pulled
 *              by moderation. It deliberately does not say which, and nor does
 *              this page: on an anonymous endpoint, "this job has expired"
 *              confirms the id is real, which is an enumeration oracle.
 *   failed   — something else broke
 *
 * ⚠️ `missing` and `failed` are kept apart on purpose. Showing "job not found"
 * for a 500 would hide an outage behind a tidy page, and nobody would report
 * it because the page looks like it is working.
 *
 * ---------------------------------------------------------------------------
 * 🔴 THE TITLE IS THE JOB'S TITLE, WHICH ROUTE DATA CANNOT PROVIDE
 * ---------------------------------------------------------------------------
 * Route `seo` data is static, so every job would otherwise be indexed as one
 * page called "Job" — the worst available SEO outcome for a job board. So the
 * metadata is set from the response via `SeoService.setFromData`, inside the
 * subscribe: Angular's server renderer waits for outstanding HttpClient
 * requests before serialising, so a tag set there IS in the served HTML.
 *
 * ⚠️ 7A's verification curls the SSR output and greps for the job title in
 * `<title>` rather than trusting that reasoning.
 */
@Component({
  selector: 'app-job-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe],
  templateUrl: './job-detail.component.html',
  styleUrl: './job-detail.component.scss',
})
export class JobDetailComponent implements OnInit {
  private readonly api = inject(PublicApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);

  protected readonly job = signal<PublicJobDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly missing = signal(false);
  protected readonly failed = signal(false);

  /**
   * ⚠️ No job travels with this link, and that is recorded rather than hidden.
   * See `applyAsTeacherUrl` and G41: jp-teacher reads no `?redirect=`, has no
   * apply route, and keys jobs by an integer the public surface never exposes.
   */
  protected readonly applyUrl = applyAsTeacherUrl();

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const uid = uidFromSlug(params.get('slug'));

          this.loading.set(true);
          this.missing.set(false);
          this.failed.set(false);

          /*
            🔴 A SLUG WITH NO UID IN IT NEVER REACHES THE API.

            /jobs/not-a-real-job has nothing to look up, so asking the server
            would spend one of the visitor's rate-limited requests to be told
            what is already known. It is the same answer either way.
          */
          if (!uid) {
            return of(null);
          }

          return this.api.getJob(uid);
        }),
      )
      .subscribe({
        next: (job) => {
          this.loading.set(false);

          if (!job) {
            this.missing.set(true);

            /*
              The server answered 404; Angular's renderer still returns HTTP 200
              for whatever it renders, so to a crawler this is a soft 404.
              `noindex` is the mitigation — see SeoService.setNoIndex, which
              says plainly that it is not the fix.
            */
            this.seo.setNoIndex();

            return;
          }

          this.job.set(job);

          this.seo.setFromData({
            title: fitTitle(job.jobTitle, job.schoolName),
            description: this.metaDescription(job),
          });
        },

        error: () => {
          this.loading.set(false);
          this.failed.set(true);
        },
      });
  }

  /**
   * ~155 characters of what the job actually is.
   *
   * ⚠️ Built from FACTS, not from the school's free-text description. A
   * description can be empty, can be a wall of formatting, or can open with
   * "Dear candidate" — none of which tells a person reading search results
   * whether this job is worth a click.
   */
  private metaDescription(job: PublicJobDetail): string {
    const parts = [
      job.designationName ?? job.jobTitle,
      job.subjectName ? `teaching ${job.subjectName}` : null,
      [job.cityName, job.stateName].filter(Boolean).join(', ') || null,
      job.employmentTypeName,
    ].filter(Boolean);

    const sentence = `${job.schoolName} is hiring: ${parts.join(' · ')}.`;

    return `${sentence} Apply free on Staffroom India.`.slice(0, 300);
  }

  /* ----------------------------------------------------------- display --- */

  protected where(job: PublicJobDetail): string | null {
    return [job.branchCityName ?? job.cityName, job.stateName].filter(Boolean).join(', ') || null;
  }

  protected salary(job: PublicJobDetail): string | null {
    const { salaryMin, salaryMax, isSalaryNegotiable } = job;

    if (salaryMin && salaryMax) return `${money(salaryMin)} – ${money(salaryMax)} a month`;
    if (salaryMin) return `From ${money(salaryMin)} a month`;
    if (salaryMax) return `Up to ${money(salaryMax)} a month`;

    return isSalaryNegotiable ? 'Negotiable' : null;
  }

  protected experience(job: PublicJobDetail): string | null {
    const min = job.minExperienceMonths;
    const max = job.maxExperienceMonths;

    if (min === null && max === null) return null;
    if (min !== null && min === 0 && max === null) return 'Freshers welcome';
    if (min !== null && max !== null) return `${years(min)}–${years(max)} years`;
    if (min !== null) return `${years(min)}+ years`;

    return `Up to ${years(max as number)} years`;
  }

  protected classLevels(job: PublicJobDetail): string | null {
    return job.classLevels.map((level) => level.classLevelName).join(', ') || null;
  }
}

/**
 * A page title that fits, degrading in the order that costs the reader least.
 *
 * ---------------------------------------------------------------------------
 * 🔴 WRITTEN BECAUSE THE AUDIT CAUGHT IT, NOT BECAUSE IT WAS FORESEEN
 * ---------------------------------------------------------------------------
 * The first version was simply `${jobTitle} at ${schoolName}`, and
 * site-audit.mjs failed the detail page at 66 characters — one over its limit —
 * on the very first job it audited. Both halves are user data with no length
 * this project controls: a school called "Delhi Public School, Sector 45,
 * Gurugram" would blow any fixed format on its own.
 *
 * So, in order:
 *
 *   1. "Job Title at School Name" when it fits. Best for a search result —
 *      the reader sees the role AND who is hiring.
 *   2. "Job Title" alone when it does not. The school is the half to drop,
 *      because the meta description already opens with it ("X is hiring: …")
 *      and the role is what the searcher typed.
 *   3. A truncated job title, with an ellipsis, when even that is too long.
 *
 * ⚠️ IT NEVER CUTS A SCHOOL'S NAME MID-WORD. "Senior Teacher at Delhi Publi…"
 * reads as a broken page about a school nobody can identify, which is worse
 * than not naming the school at all.
 */
function fitTitle(jobTitle: string, schoolName: string): string {
  const budget = titleBudget();
  const preferred = `${jobTitle} at ${schoolName}`;

  if (preferred.length <= budget) return preferred;
  if (jobTitle.length <= budget) return jobTitle;

  /* -1 for the ellipsis, which is one character. */
  return `${jobTitle.slice(0, budget - 1).trimEnd()}…`;
}

/** Indian digit grouping — 1,20,000 rather than 120,000. */
function money(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function years(months: number): string {
  const value = months / 12;

  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}
