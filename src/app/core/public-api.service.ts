import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';

import { environment } from '../../environments/environment';

/*==============================================================================
  The public site's one connection to the backend. Phase 7A.

  ----------------------------------------------------------------------------
  🔒 EVERY CALL HERE IS ANONYMOUS, AND THAT IS STRUCTURAL
  ----------------------------------------------------------------------------
  There is no interceptor, no token, no credentials and no cookie. jp-public is
  UNFEDERATED and has no auth at all (2.43) — so the way auth does not creep in
  is that there is nothing to creep: this file never sets an Authorization
  header, and `withCredentials` is never passed.

  The server side matches: PublicController has no [Authorize] and reads no
  token even when one is sent, which public-contract.mjs proves by comparing
  bytes with and without one.

  ----------------------------------------------------------------------------
  ⚠️ ApiResponse IS DELIBERATELY REDECLARED HERE
  ----------------------------------------------------------------------------
  jp-school and jp-teacher import `ApiResponse<T>` from `jp-shared/models`.
  jp-public cannot: it is not a federation host or remote and has no dependency
  on jp-shared, which is the point — the public site must build and deploy on
  its own.

  So the interface is declared again, with the same name and shape, and the
  duplication is NAMED so a change to the envelope prompts a look here. What is
  NOT duplicated is behaviour: this file reads the envelope and nothing more.
==============================================================================*/

/** Mirrors `ApiResponse<T>` in jp-shared/models — see the header. */
export interface ApiResponse<T> {
  /** 1 = success, 0 = failure. */
  status: number;

  /** Machine-readable outcome code. Branch on this, never on `message`. */
  code: string | null;

  /** Display text. */
  message: string;

  data: T | null;

  /** The count BEFORE paging, for server-paged lists. */
  totalRecords?: number;

  errors?: Record<string, string[]> | null;
}

/** One job as the listing shows it. */
export interface PublicJobCard {
  jobUid: string;
  jobTitle: string;
  subjectName: string | null;
  designationName: string | null;
  employmentTypeName: string | null;
  noOfVacancies: number | null;
  minExperienceMonths: number | null;
  maxExperienceMonths: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  isSalaryNegotiable: boolean;
  cityName: string | null;
  stateName: string | null;
  lastDateToApply: string | null;
  publishedOn: string | null;
  schoolUid: string;
  schoolName: string;
  schoolLogoPath: string | null;
  isSchoolVerified: boolean;
}

export interface PublicClassLevel {
  classLevelId: number;
  classLevelName: string;
}

/** One job in full, with the school's public face. */
export interface PublicJobDetail extends PublicJobCard {
  jobDescription: string | null;
  qualificationName: string | null;
  expectedJoiningDate: string | null;
  aboutSchool: string | null;

  /** 🔴 The SCHOOL'S OWN website — not the contact form's honeypot field. */
  website: string | null;

  establishedYear: number | null;
  schoolTypeName: string | null;
  boardName: string | null;
  branchName: string | null;
  branchCityName: string | null;
  classLevels: readonly PublicClassLevel[];
}

export interface PublicFilterOption {
  id: number;
  name: string;
  jobCount: number;
}

export interface PublicJobFilters {
  subjects: readonly PublicFilterOption[];

  /** ⚠️ Empty until the city master is seeded (G40). The UI renders no city control when it is. */
  cities: readonly PublicFilterOption[];

  states: readonly PublicFilterOption[];
  classLevels: readonly PublicFilterOption[];
}

export interface PublicFaq {
  faqId: number;
  category: string;
  question: string;
  answer: string;
  displayOrder: number;
}

export interface PublicContentBlock {
  blockKey: string;
  blockTitle: string | null;
  blockContent: string;
  imagePath: string | null;
  displayOrder: number;
}

/** What the listing is filtered by. Every field optional. */
export interface JobSearchQuery {
  search?: string | null;
  subjectId?: number | null;
  cityId?: number | null;
  stateId?: number | null;
  classLevelId?: number | null;
  pageNumber?: number;
  pageSize?: number;
}

/** A server-paged page of results. */
export interface Page<T> {
  rows: readonly T[];
  total: number;
}

export interface ContactEnquiry {
  name: string;
  email: string;
  mobile?: string | null;
  subject: string;
  message: string;

  /**
   * 🔴 THE HONEYPOT, and its name is the mechanism.
   *
   * A field called `honeypot` would be skipped by anything that reads the
   * markup. `website` looks like a field a real form would have, so a bot
   * filling everything fills it — and the server then returns 200 and writes
   * NOTHING. A person never sees it: the input is hidden and not tabbable.
   *
   * ⚠️ Leave it OUT of a real submission rather than sending an empty string.
   * The server checks for whitespace, so either works — but sending it at all
   * invites somebody to "helpfully" bind it to a visible input.
   */
  website?: string;
}

@Injectable({ providedIn: 'root' })
export class PublicApiService {
  private readonly http = inject(HttpClient);

  private readonly base = `${environment.apiUrl}/public`;

  /**
   * The job listing. Server-paged.
   *
   * ⚠️ `total` is the count BEFORE paging, so "showing 1-20 of 94" is honest.
   * Counting the rows on this page would show "20 of 20" on every page.
   */
  searchJobs(query: JobSearchQuery): Observable<Page<PublicJobCard>> {
    let params = new HttpParams();

    /*
      Only non-empty values are sent. An empty `search=` would otherwise reach
      the procedure as a parameter it has to treat as "no filter", and the
      request URL would differ for two identical searches — which splits the
      transfer cache and any future HTTP cache for no reason.
    */
    const add = (key: string, value: string | number | null | undefined) => {
      if (value !== null && value !== undefined && `${value}`.trim() !== '') {
        params = params.set(key, `${value}`);
      }
    };

    add('search', query.search);
    add('subjectId', query.subjectId);
    add('cityId', query.cityId);
    add('stateId', query.stateId);
    add('classLevelId', query.classLevelId);
    add('pageNumber', query.pageNumber);
    add('pageSize', query.pageSize);

    return this.http
      .get<ApiResponse<PublicJobCard[]>>(`${this.base}/jobs`, { params })
      .pipe(map((r) => ({ rows: r.data ?? [], total: r.totalRecords ?? 0 })));
  }

  /**
   * One job, by uid.
   *
   * 🔴 RESOLVES TO null ON 404 RATHER THAN THROWING, because a 404 here is an
   * expected answer, not a failure. The server returns it for every reason a
   * job is not public — draft, expired, closed, deleted, pulled by moderation —
   * and deliberately does not say which (an anonymous endpoint that explains
   * itself is an enumeration oracle). The page renders "not found" for all of
   * them, which is the same thing the server is saying.
   *
   * ⚠️ Any OTHER error is rethrown. A 500 or a dead API is not "no such job",
   * and showing "not found" for it would hide an outage behind a tidy page.
   */
  getJob(jobUid: string): Observable<PublicJobDetail | null> {
    return this.http
      .get<ApiResponse<PublicJobDetail>>(`${this.base}/jobs/${jobUid}`)
      .pipe(
        map((r) => r.data ?? null),
        catchError((error: HttpErrorResponse) =>
          error.status === 404 ? of(null) : throwError(() => error)),
      );
  }

  /** The values the listing may be filtered by, with live counts. */
  getFilters(): Observable<PublicJobFilters> {
    return this.http
      .get<ApiResponse<PublicJobFilters>>(`${this.base}/jobs/filters`)
      .pipe(map((r) => r.data ?? { subjects: [], cities: [], states: [], classLevels: [] }));
  }

  /** The FAQ copy, from the database (2.81). */
  getFaqs(): Observable<readonly PublicFaq[]> {
    return this.http
      .get<ApiResponse<PublicFaq[]>>(`${this.base}/faqs`)
      .pipe(map((r) => r.data ?? []));
  }

  getContentBlocks(): Observable<readonly PublicContentBlock[]> {
    return this.http
      .get<ApiResponse<PublicContentBlock[]>>(`${this.base}/content-blocks`)
      .pipe(map((r) => r.data ?? []));
  }

  /**
   * The contact form.
   *
   * ⚠️ A 200 does NOT prove a row was written, and the caller must not claim it
   * did. A filled honeypot also returns 200 with no row — that is the design
   * (telling a bot it was caught teaches whoever wrote it to stop filling the
   * field). So the message shown is "we have your message", which is what we
   * can honestly say to a person; a bot reads the same words and learns
   * nothing.
   */
  submitEnquiry(enquiry: ContactEnquiry): Observable<void> {
    return this.http
      .post<ApiResponse<null>>(`${this.base}/contact`, enquiry)
      .pipe(map(() => undefined));
  }
}

/*==============================================================================
  SLUGS

  🔴 THE UID IS THE IDENTITY; THE WORDS IN FRONT OF IT ARE DECORATION.

  A job URL reads /jobs/maths-teacher-at-greenwood-<uid>. The title part is
  there for a person scanning a link and for a crawler reading the path; the uid
  is what resolves. So a school renaming its vacancy does NOT break a link that
  is already shared or indexed — the old words still carry the right uid.

  ⚠️ No slug COLUMN, deliberately. A stored slug has to be kept unique, kept in
  step with the title, and kept forever once indexed. All of that work buys
  nothing the trailing uid does not already give.

  ⚠️ And the public surface exposes no integer id to put here instead (2.47):
  public-contract.mjs's allowlist FAILS on a `"jobId"` key.
==============================================================================*/

/** Matches a uid at the END of a slug. */
const TRAILING_UID = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** A bare uid, for a link written without the decorative part. */
const BARE_UID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function jobSlug(job: { jobTitle: string; jobUid: string }): string {
  const words = job.jobTitle
    .toLowerCase()
    .normalize('NFKD')
    /* Strip accents, then anything that is not a letter, digit or space. */
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    /*
      ⚠️ Capped. A job title can be long, and a 200-character path segment is
      an ugly link that some mail clients break across lines.
    */
    .slice(0, 60)
    .replace(/-+$/, '');

  return words ? `${words}-${job.jobUid}` : job.jobUid;
}

/**
 * The uid from a slug, or null.
 *
 * ⚠️ Accepts a BARE uid too. Nothing in this app generates one, but a link
 * typed or logged by hand is a reasonable thing to resolve rather than 404.
 */
export function uidFromSlug(slug: string | null | undefined): string | null {
  if (!slug) return null;

  if (BARE_UID.test(slug)) return slug;

  return TRAILING_UID.exec(slug)?.[1] ?? null;
}
