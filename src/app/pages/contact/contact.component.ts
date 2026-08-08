import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { environment } from '../../../environments/environment';

/**
 * Contact form.
 *
 * 🔴 THERE IS NO ENDPOINT. `t_app_contact_enquiries` and the API that writes to
 * it are Phase 7.
 *
 * So the form validates and then tells the truth: it says plainly that it could
 * not be sent and gives the email address instead, with the message preserved
 * in the fields so it can be copied.
 *
 * It deliberately does NOT show a success message. Someone will use this form
 * and expect a reply; a fake "thanks, we'll be in touch" would mean their
 * enquiry disappears and they never follow up any other way. Losing a real
 * enquiry is worse than an ugly message.
 *
 * To wire it up in Phase 7: inject the enquiries service, POST in `submit()`,
 * and replace `state` handling with the real success and failure branches.
 */
@Component({
  selector: 'app-contact',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
})
export class ContactComponent {
  private readonly fb = inject(FormBuilder);

  protected readonly contactEmail = environment.contactEmail;

  /** `idle` until a valid submit; then `unsent`, which is the honest outcome. */
  protected readonly state = signal<'idle' | 'unsent'>('idle');

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    role: ['teacher', [Validators.required]],
    subject: ['', [Validators.required, Validators.maxLength(150)]],
    message: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(2000)]],
  });

  /** A field shows its error only once it has been touched or submitted. */
  protected showError(field: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.state() === 'unsent');
  }

  protected errorFor(field: keyof typeof this.form.controls): string | null {
    const control = this.form.controls[field];
    if (!this.showError(field)) return null;

    const errors = control.errors ?? {};
    if (errors['required']) return 'This is required.';
    if (errors['email']) return 'Enter a valid email address, like name@school.edu.in.';
    if (errors['minlength'])
      return `Tell us a little more — at least ${errors['minlength'].requiredLength} characters.`;
    if (errors['maxlength'])
      return `That is longer than the ${errors['maxlength'].requiredLength} characters we can accept.`;

    return 'Check this field.';
  }

  /** The body of a mailto: fallback, prefilled from whatever they typed. */
  protected mailtoHref(): string {
    const { name, email, role, subject, message } = this.form.getRawValue();
    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      `I am a: ${role}`,
      '',
      message,
    ].join('\n');

    return `mailto:${this.contactEmail}?subject=${encodeURIComponent(
      subject || 'Enquiry from staffroom.in',
    )}&body=${encodeURIComponent(body)}`;
  }

  protected submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.state.set('idle');
      return;
    }

    // No POST. See the class comment — this is deliberate, not unfinished.
    this.state.set('unsent');
  }
}
