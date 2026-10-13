import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicApiService, PublicFaq } from '../../core/public-api.service';

/**
 * FAQ, grouped by audience so the footer can link straight to the half that
 * applies (`#teachers`, `#schools`).
 *
 * ---------------------------------------------------------------------------
 * 🔴 THE COPY MOVED TO THE DATABASE IN 7A, AND THE ARRAY IS GONE
 * ---------------------------------------------------------------------------
 * 2.44 wrote these twelve questions into a `readonly Qa[]` here and prerendered
 * the page. 2.81 made FAQs one of exactly two things an admin may edit without
 * a deploy, so they now come from `t_app_faqs` via `/api/public/faqs` and this
 * route is `RenderMode.Server`.
 *
 * ⚠️ THE ARRAY WAS DELETED, NOT COMMENTED OUT. Two copies of this text — one of
 * them unreachable — is how the next person edits the wrong one and cannot work
 * out why the page does not change.
 *
 * ⚠️ One answer changed in the same commit: "Can I search for jobs without an
 * account?" used to answer "Not yet", and 7A built public job search. The seed
 * carries the correction and a guard that fails if the old wording comes back.
 *
 * ---------------------------------------------------------------------------
 * GENERAL IS RENDERED, EVEN THOUGH NOTHING SEEDS IT
 * ---------------------------------------------------------------------------
 * The table's CHECK allows TEACHER, SCHOOL and GENERAL; the seed uses only the
 * first two. An admin adding a GENERAL question would otherwise write something
 * that silently appears nowhere — so there is a third section that exists only
 * when it has content.
 */
@Component({
  selector: 'app-faq',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.scss',
})
export class FaqComponent implements OnInit {
  private readonly api = inject(PublicApiService);

  protected readonly faqs = signal<readonly PublicFaq[]>([]);

  /**
   * `loading` starts true so the first paint is not an empty page claiming
   * there are no questions.
   *
   * ⚠️ During server rendering this never reaches the browser as `true`: the
   * renderer waits for the request, so the HTML it serves is the loaded state.
   * It matters for a client-side navigation into this route.
   */
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);

  protected readonly teacherQuestions = computed(() => this.inCategory('TEACHER'));
  protected readonly schoolQuestions = computed(() => this.inCategory('SCHOOL'));
  protected readonly generalQuestions = computed(() => this.inCategory('GENERAL'));

  ngOnInit(): void {
    this.api.getFaqs().subscribe({
      next: (faqs) => {
        this.faqs.set(faqs);
        this.loading.set(false);
      },

      /*
        🔴 A FAILURE SAYS SO AND OFFERS THE WAY OUT.
        An empty FAQ page that looks finished is worse than one that admits it
        could not load and points at /contact — somebody with a real question
        would otherwise conclude we have no answer.
      */
      error: () => {
        this.loading.set(false);
        this.failed.set(true);
      },
    });
  }

  /**
   * ⚠️ Ordering is the SERVER'S. The procedure orders by category and
   * DisplayOrder, and an admin reordering the list is making a deliberate
   * editorial choice; re-sorting here would quietly overrule it.
   */
  private inCategory(category: string): readonly PublicFaq[] {
    return this.faqs().filter((faq) => faq.category === category);
  }
}
