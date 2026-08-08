import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Audience, AuthMode, authUrl, parseAuthMode } from '../../core/portal-links';

/**
 * What each audience came to do, and how that reads on the page.
 *
 * 🔴 Framed by the ACTION, not the identity. "I am a school" makes a visitor
 * classify themselves before they can proceed; "Hire teachers" lets them
 * recognise their own errand and click. Second line stays short — this is a
 * fork in a corridor, not a page anyone reads.
 */
const AUDIENCE_COPY: Readonly<Record<Audience, { title: string; detail: string }>> = {
  school: {
    title: 'Hire teachers',
    detail: 'Post vacancies and shortlist applicants.',
  },
  teacher: {
    title: 'Find a teaching job',
    detail: 'Apply to schools across India.',
  },
};

/**
 * Order is fixed and means nothing. Both options are rendered identically —
 * same surface, same type, same weight, same size — because the page is a
 * fork, not a recommendation. If one ever needs to look more inviting than
 * the other, that is a homepage decision, not a chooser decision.
 */
const AUDIENCES: readonly Audience[] = ['school', 'teacher'];

function actionLabel(audience: Audience, mode: AuthMode): string {
  return mode === 'signup' ? `Create a ${audience} account` : `Sign in as a ${audience}`;
}

interface ChooserOption {
  readonly audience: Audience;
  readonly title: string;
  readonly detail: string;
  readonly action: string;
  readonly href: string;
}

/**
 * The audience chooser — `/continue?mode=login` and `/continue?mode=signup`.
 *
 * Reached from the header's Sign in and Sign up, which are the only two places
 * on the public site where the visitor's errand is genuinely unknown. The
 * homepage CTAs and a job page's Apply already know who they are talking to
 * and go straight to the right application, skipping this page — a chooser
 * shown to someone who has already chosen is just a click.
 *
 * 🔴 There are exactly two options and there will never be three. Admin is
 * internal and is not advertised, linked, or named on a public page. The
 * `Audience` type has no admin member, so this is enforced by the compiler
 * rather than by remembering.
 *
 * `mode` arrives from the query string through `withComponentInputBinding`,
 * so it is resolved during server rendering and the correct heading is in the
 * first byte of HTML rather than appearing after hydration.
 */
@Component({
  selector: 'app-continue',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './continue.component.html',
  styleUrl: './continue.component.scss',
})
export class ContinueComponent {
  /** Bound from the `mode` query parameter. Anything unrecognised reads as sign-in. */
  readonly mode = input<string | undefined>();

  protected readonly authMode = computed(() => parseAuthMode(this.mode()));

  protected readonly heading = computed(() =>
    this.authMode() === 'signup' ? 'Create an account' : 'Sign in',
  );

  protected readonly options = computed<readonly ChooserOption[]>(() => {
    const mode = this.authMode();

    return AUDIENCES.map((audience) => ({
      audience,
      ...AUDIENCE_COPY[audience],
      action: actionLabel(audience, mode),
      href: authUrl(audience, mode),
    }));
  });

  /**
   * The other mode, offered for both audiences.
   *
   * Someone who pressed Sign up and does have an account should not have to go
   * back to the header to find that out, and the same in reverse.
   */
  protected readonly alternate = computed(() => {
    const other: AuthMode = this.authMode() === 'signup' ? 'login' : 'signup';

    return {
      prompt: other === 'login' ? 'Already have an account?' : 'New here?',
      links: AUDIENCES.map((audience) => ({
        audience,
        label: actionLabel(audience, other),
        href: authUrl(audience, other),
      })),
    };
  });
}
