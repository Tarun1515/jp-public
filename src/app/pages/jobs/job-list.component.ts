import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { switchMap, tap } from 'rxjs/operators';

import {
  JobSearchQuery,
  PublicApiService,
  PublicJobCard,
  PublicJobFilters,
  jobSlug,
} from '../../core/public-api.service';

/**
 * The public job listing. Phase 7A.
 *
 * ---------------------------------------------------------------------------
 * 🔴 EVERY FILTER LIVES IN THE URL, AND THAT IS NOT A PREFERENCE
 * ---------------------------------------------------------------------------
 * `/jobs?subjectId=3&stateId=12&pageNumber=2` is the whole state of this page.
 * Three things depend on it:
 *
 *   1. SERVER RENDERING. This route is `RenderMode.Server`, so the HTML is
 *      built per request — and it can only build the right page if the request
 *      says which page. Filters held in component state would render the
 *      unfiltered first page for every URL and then correct themselves after
 *      hydration, which is what a crawler would index.
 *   2. SHARING. A teacher sends a colleague "maths jobs in Kerala" as a link.
 *   3. THE BACK BUTTON. Returning from a job to the list lands on the search
 *      they ran, not on page one of everything.
 *
 * ⚠️ Read from `queryParamMap` rather than through `withComponentInputBinding`.
 * Both work, but the observable gives one place to parse and one `switchMap`
 * that cancels an in-flight request when the visitor changes a filter again —
 * which is the difference between the last response winning and an arbitrary
 * one winning.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ NO CITY CONTROL UNTIL THERE ARE CITIES (G40)
 * ---------------------------------------------------------------------------
 * `m_mdm_city` is unseeded, so `/jobs/filters` returns an empty city list and
 * this page renders no city control. A dropdown whose every option returns
 * nothing is worse than its absence. The day the master is seeded the control
 * appears with no code change, because it is driven by what the server sends.
 */
@Component({
  selector: 'app-job-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, DatePipe],
  templateUrl: './job-list.component.html',
  styleUrl: './job-list.component.scss',
})
export class JobListComponent implements OnInit {
  private readonly api = inject(PublicApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly jobs = signal<readonly PublicJobCard[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);

  protected readonly filters = signal<PublicJobFilters>({
    subjects: [],
    cities: [],
    states: [],
    classLevels: [],
  });

  /** The applied query, parsed from the URL. Drives the controls' values. */
  protected readonly applied = signal<Required<Pick<JobSearchQuery, 'pageNumber' | 'pageSize'>> & JobSearchQuery>({
    pageNumber: 1,
    pageSize: PAGE_SIZE,
  });

  /** What the text box holds. Separate from `applied.search`, which is what ran. */
  protected readonly searchText = signal('');

  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.applied().pageSize)));

  protected readonly firstOnPage = computed(() =>
    this.total() === 0 ? 0 : (this.applied().pageNumber - 1) * this.applied().pageSize + 1);

  protected readonly lastOnPage = computed(() =>
    Math.min(this.applied().pageNumber * this.applied().pageSize, this.total()));

  /** True when any filter is set — so "no results" can offer to clear them. */
  protected readonly hasFilters = computed(() => {
    const q = this.applied();
    return !!(q.search || q.subjectId || q.stateId || q.classLevelId || q.cityId);
  });

  ngOnInit(): void {
    /*
      The filter lists are fetched ONCE and are not re-fetched per search. Their
      counts go slightly stale within a visit, which is the right trade: a
      refetch on every keystroke-driven navigation would triple the requests to
      keep a number beside a dropdown option exact.

      ⚠️ A failure here is NOT surfaced. Without the lists the page still works
      — text search and paging are unaffected — so an error banner would report a
      problem the visitor cannot act on and does not have.
    */
    this.api.getFilters().subscribe({
      next: (filters) => this.filters.set(filters),
      error: () => this.filters.set({ subjects: [], cities: [], states: [], classLevels: [] }),
    });

    this.route.queryParamMap
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.failed.set(false);
        }),
        switchMap((params) => {
          const query: JobSearchQuery = {
            search: params.get('search'),
            subjectId: toId(params.get('subjectId')),
            cityId: toId(params.get('cityId')),
            stateId: toId(params.get('stateId')),
            classLevelId: toId(params.get('classLevelId')),
            pageNumber: toPage(params.get('pageNumber')),
            pageSize: PAGE_SIZE,
          };

          this.applied.set({ ...query, pageNumber: query.pageNumber ?? 1, pageSize: PAGE_SIZE });
          this.searchText.set(query.search ?? '');

          return this.api.searchJobs(query);
        }),
      )
      .subscribe({
        next: (page) => {
          this.jobs.set(page.rows);
          this.total.set(page.total);
          this.loading.set(false);
        },

        /*
          🔴 A FAILED SEARCH SAYS SO. The alternative — an empty list — tells the
          visitor there are no teaching jobs in India, which is a far more
          damaging thing to say wrongly than "something went wrong".
        */
        error: () => {
          this.jobs.set([]);
          this.total.set(0);
          this.loading.set(false);
          this.failed.set(true);
        },
      });
  }

  /** The link for a card. The uid resolves; the words are for the reader. */
  protected slugFor(job: PublicJobCard): string {
    return jobSlug(job);
  }

  protected runSearch(): void {
    this.navigate({ search: this.searchText().trim() || null, pageNumber: null });
  }

  protected clearFilters(): void {
    this.searchText.set('');

    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  protected pickSubject(value: string): void {
    this.navigate({ subjectId: value || null, pageNumber: null });
  }

  protected pickState(value: string): void {
    this.navigate({ stateId: value || null, pageNumber: null });
  }

  protected pickCity(value: string): void {
    this.navigate({ cityId: value || null, pageNumber: null });
  }

  protected pickClassLevel(value: string): void {
    this.navigate({ classLevelId: value || null, pageNumber: null });
  }

  protected goToPage(page: number): void {
    this.navigate({ pageNumber: page <= 1 ? null : page });
  }

  /**
   * ⚠️ `pageNumber: null` on every filter change, deliberately. Narrowing a
   * search while on page 4 of the old one lands on a page that may not exist,
   * and the visitor sees an empty list for a search that has results.
   *
   * `null` REMOVES the parameter rather than setting it to 1, so `/jobs` stays
   * the canonical URL for the unfiltered first page instead of competing with
   * `/jobs?pageNumber=1`.
   */
  private navigate(changes: Record<string, string | number | null>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: changes,
      queryParamsHandling: 'merge',
    });
  }

  /* ----------------------------------------------------------- display --- */

  /**
   * Salary, as a range, a floor, or "Negotiable".
   *
   * ⚠️ Shows nothing rather than "₹0" when a school left it blank. A fabricated
   * zero reads as "this job pays nothing", which is a claim about somebody
   * else's vacancy that we are in no position to make.
   */
  protected salary(job: PublicJobCard): string | null {
    const { salaryMin, salaryMax, isSalaryNegotiable } = job;

    if (salaryMin && salaryMax) {
      return `${money(salaryMin)} – ${money(salaryMax)} a month`;
    }

    if (salaryMin) return `From ${money(salaryMin)} a month`;
    if (salaryMax) return `Up to ${money(salaryMax)} a month`;

    return isSalaryNegotiable ? 'Negotiable' : null;
  }

  /** Experience, in the years a person would say out loud. */
  protected experience(job: PublicJobCard): string | null {
    const min = job.minExperienceMonths;
    const max = job.maxExperienceMonths;

    if (min === null && max === null) return null;
    if (min !== null && min === 0 && max === null) return 'Freshers welcome';
    if (min !== null && max !== null) return `${years(min)}–${years(max)} years`;
    if (min !== null) return `${years(min)}+ years`;

    return `Up to ${years(max as number)} years`;
  }

  protected where(job: PublicJobCard): string | null {
    /* City first when it exists; today it never does (G40), so state carries it. */
    return [job.cityName, job.stateName].filter(Boolean).join(', ') || null;
  }
}

/**
 * ⚠️ Fixed, and not a visitor-controlled parameter.
 *
 * The API accepts `pageSize`, and letting the URL set it would let anyone ask
 * for `pageSize=10000` — one request that returns the whole catalogue, which is
 * precisely what the anonymous rate limit exists to make expensive. The server
 * caps it too; this is the half that does not depend on remembering to.
 */
const PAGE_SIZE = 20;

function toId(value: string | null): number | null {
  if (!value) return null;

  const n = Number(value);

  /* Rejects '3abc', '-1', '1.5' and ''. A bad id is treated as no filter. */
  return Number.isInteger(n) && n > 0 ? n : null;
}

function toPage(value: string | null): number {
  const n = Number(value);

  return Number.isInteger(n) && n > 0 ? n : 1;
}

/** Indian digit grouping — 1,20,000 rather than 120,000. */
function money(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function years(months: number): string {
  const value = months / 12;

  /* 18 months reads as 1.5; 24 reads as 2, not 2.0. */
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}
