import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Privacy policy.
 *
 * 🔴 Same rule as the terms page: the structure is real, the body is a
 * reviewable placeholder, and it must not be published without client-approved
 * wording. See PROJECT_MEMORY under known gaps.
 *
 * ⚠️ India's Digital Personal Data Protection Act, 2023 applies here and
 * imposes specific obligations — notice, consent, and the rights of a Data
 * Principal among them. Those are named below so the eventual draft covers
 * them, not so this page can pass as compliant. It is not.
 */
@Component({
  selector: 'app-privacy',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './privacy.component.html',
})
export class PrivacyComponent {
  protected readonly lastUpdated = 'not yet published';
}
