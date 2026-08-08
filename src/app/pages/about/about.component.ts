import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { signUpUrl } from '../../core/portal-links';

/**
 * About.
 *
 * No founder photographs, no numbers, no "our mission is to revolutionise".
 * The page has one job: explain why verification is the thing this product is
 * built around, because that is the only claim here a competitor cannot copy
 * by writing better marketing copy.
 */
@Component({
  selector: 'app-about',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './about.component.html',
})
export class AboutComponent {
  protected readonly teacherSignUpUrl = signUpUrl('teacher');
  protected readonly schoolSignUpUrl = signUpUrl('school');
}
