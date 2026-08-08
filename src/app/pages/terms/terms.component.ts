import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Terms of use.
 *
 * 🔴 THE HEADINGS ARE REAL. THE BODY IS NOT LEGAL COPY.
 *
 * The structure below is what a platform of this kind needs to cover, and each
 * section says plainly what it will govern. The wording is a plain-language
 * placeholder so the page is reviewable — it has NOT been drafted or checked by
 * a lawyer, and it must not go live as it stands.
 *
 * ⚠️ The client must supply or approve the actual wording before launch.
 * Inventing enforceable terms is not something to do on a client's behalf.
 * Recorded in PROJECT_MEMORY under known gaps.
 */
@Component({
  selector: 'app-terms',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './terms.component.html',
})
export class TermsComponent {
  /** Shown in the page so a reviewer can see how current the draft is. */
  protected readonly lastUpdated = 'not yet published';
}
