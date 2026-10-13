import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';

import { signUpUrl } from './core/portal-links';
import { SeoService } from './core/seo.service';
import { environment } from '../environments/environment';

/**
 * Public website shell: header, routed content, footer.
 *
 * ⚠️ Every link in here resolves to a page that exists, and that rule is why
 * "Find jobs" was ABSENT until Phase 7A: the note here used to read "job search
 * is Phase 4 and needs data that does not exist yet… a nav item leading to a
 * 404 makes a finished build look broken". /jobs now exists and serves real
 * vacancies, so the link is back — restored by the same rule that removed it,
 * not in spite of it.
 *
 * 🔴 IT IS FIRST IN THE LIST, and that is the point of the page. Someone
 * arriving at a teaching-jobs site is looking for teaching jobs; "How it works"
 * led the nav only while there was nothing to look at.
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly seo = inject(SeoService);
  private readonly router = inject(Router);

  protected readonly currentYear = new Date().getFullYear();

  protected readonly menuOpen = signal(false);

  /**
   * Sign-up links that skip `/continue`.
   *
   * A link that already says "Register your school" has had the question
   * answered. The chooser exists for the header, where nothing about the click
   * says who is clicking.
   */
  protected readonly schoolSignUpUrl = signUpUrl('school');
  protected readonly teacherSignUpUrl = signUpUrl('teacher');

  protected readonly contactEmail = environment.contactEmail;

  protected readonly navLinks = [
    { label: 'Find jobs', route: '/jobs' },
    { label: 'How it works', route: '/how-it-works' },
    { label: 'About', route: '/about' },
    { label: 'FAQ', route: '/faq' },
    { label: 'Contact', route: '/contact' },
  ];

  constructor() {
    this.seo.init();

    // Close the drawer on navigation. Without this it stays open over the new
    // page after a link inside it is followed.
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.menuOpen.set(false));
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }
}
