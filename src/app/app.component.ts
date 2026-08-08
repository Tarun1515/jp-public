import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';

import { signUpUrl } from './core/portal-links';
import { SeoService } from './core/seo.service';
import { environment } from '../environments/environment';

/**
 * Public website shell: header, routed content, footer.
 *
 * ⚠️ Every link in here resolves to a page that exists. There is deliberately
 * no "Find jobs" or "Browse jobs" entry — job search is Phase 4 and needs data
 * that does not exist yet. A nav item leading to a 404 makes a finished build
 * look broken, which is worse than the item being absent.
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
