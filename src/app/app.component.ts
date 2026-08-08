import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/**
 * Public website shell: header, routed content, footer.
 *
 * PHASE 4 builds the actual pages (home, job search, how it works, about,
 * contact, FAQ, terms, privacy) from `m_app_cms_page_types` and the CMS
 * tables. The chrome exists now so the design system has something to render
 * and the SSR pipeline is exercised end to end.
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  protected readonly currentYear = new Date().getFullYear();

  protected readonly menuOpen = signal(false);

  protected readonly navLinks = [
    { label: 'Find jobs', route: '/jobs' },
    { label: 'For schools', route: '/for-schools' },
    { label: 'How it works', route: '/how-it-works' },
    { label: 'About', route: '/about' },
    { label: 'Contact', route: '/contact' },
  ];

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }
}
