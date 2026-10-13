import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { environment } from '../../../environments/environment';
import { PublicApiService } from '../../core/public-api.service';

/**
 * Contact form. Phase 7A wired it to a real endpoint.
 *
 * ---------------------------------------------------------------------------
 * 🔴 WHAT CHANGED, AND WHY THE OLD BEHAVIOUR WAS RIGHT AT THE TIME
 * ---------------------------------------------------------------------------
 * 2.44 shipped this form validating and then SAYING it had not sent anything,
 * with a mailto: fallback — because there was no endpoint, and "a fake 'thanks,
 * we'll be in touch' means their enquiry disappears and they never follow up
 * any other way". That was the honest thing to do with no table behind it.
 *
 * `t_app_contact_enquiries` and `POST /api/public/contact` now exist, so the
 * honest message is a real one. The `unsent` state is GONE, replaced by `sent`
 * and `failed`.
 *
 * ⚠️ The mailto: fallback stays, and is shown when a submission FAILS. A form
 * that cannot submit and offers no alternative loses the enquiry, which is the
 * exact failure 2.44 was protecting against.
 *
 * ---------------------------------------------------------------------------
 * 🔒 THE HONEYPOT
 * ---------------------------------------------------------------------------
 * A `website` control sits in the form and is hidden from people — off-screen,
 * `tabindex="-1"`, `aria-hidden`. A bot that fills every input fills it, and
 * the server then returns 200 and writes NOTHING.
 *
 * 🔴 NOTHING IS CHECKED HERE. The browser is the one place this must NOT be
 * decided: client-side code is readable, and refusing the submit locally tells
 * whoever wrote the bot which field is the trap. The server decides, silently.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ THE `role` FIELD WAS REMOVED, DELIBERATELY
 * ---------------------------------------------------------------------------
 * 2.44's form asked "I am a: teacher / school" and put the answer in a mailto:
 * body. `t_app_contact_enquiries` has no column for it, and the brief did not
 * ask for one.
 *
 * The options were: add a column the brief never asked for; keep the control
 * and drop the answer on the floor; or stop asking. The middle one is the only
 * clearly wrong choice — a form that collects something and discards it. And a
 * question never asked loses nothing, because the message says which they are
 * in almost every case. Recorded here so the removal reads as a decision.
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
  private readonly api = inject(PublicApiService);

  protected readonly contactEmail = environment.contactEmail;

  /**
   * `idle` → `sending` → `sent` or `failed`.
   *
   * ⚠️ `sending` exists so the button can be disabled. Without it, a slow
   * connection invites a second press, and the form's own 3-per-hour limit
   * would then refuse the duplicate — the visitor would see a failure for an
   * enquiry we actually received.
   */
  protected readonly state = signal<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  /** Set when the server rejects the shape — keyed by field, as the API sends. */
  protected readonly serverErrors = signal<Record<string, string[]>>({});

  protected readonly form = this.fb.nonNullable.group({
    /*
      ⚠️ MAXLENGTHS MATCH THE COLUMNS, and so do the server's rules
      (ContactEnquiryRequestValidator). A browser limit looser than the column
      turns a clean "that is too long" into a server error on submit.
    */
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
    mobile: ['', [Validators.pattern(/^[6-9]\d{9}$/)]],
    subject: ['', [Validators.required, Validators.maxLength(200)]],
    message: ['', [Validators.required, Validators.maxLength(2000)]],

    /*
      🔒 The honeypot. Never shown, never validated, never read here — see the
      class comment. It is in the form only so that a bot filling the markup
      fills it.
    */
    website: [''],
  });

  /** A field shows its error only once it has been touched or submitted. */
  protected showError(field: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[field];

    return control.invalid && (control.touched || this.state() === 'failed');
  }

  protected errorFor(field: keyof typeof this.form.controls): string | null {
    /* The server's own message wins — it is the one that actually refused. */
    const fromServer = this.serverErrors()[field] ?? this.serverErrors()[capitalise(field)];

    if (fromServer?.length) return fromServer[0];

    const control = this.form.controls[field];

    if (!this.showError(field)) return null;

    const errors = control.errors ?? {};

    if (errors['required']) return 'This is required.';
    if (errors['email']) return 'Enter a valid email address, like name@school.edu.in.';
    if (errors['pattern']) return 'Enter a valid 10-digit mobile number, or leave it blank.';
    if (errors['maxlength'])
      return `That is longer than the ${errors['maxlength'].requiredLength} characters we can accept.`;

    return 'Check this field.';
  }

  /** The body of a mailto: fallback, prefilled from whatever they typed. */
  protected mailtoHref(): string {
    const { name, email, mobile, subject, message } = this.form.getRawValue();

    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      mobile ? `Mobile: ${mobile}` : null,
      '',
      message,
    ]
      .filter((line) => line !== null)
      .join('\n');

    return `mailto:${this.contactEmail}?subject=${encodeURIComponent(
      subject || 'Enquiry from staffroom.in',
    )}&body=${encodeURIComponent(body)}`;
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    this.serverErrors.set({});

    if (this.form.invalid) {
      this.state.set('failed');
      return;
    }

    this.state.set('sending');

    const { name, email, mobile, subject, message, website } = this.form.getRawValue();

    this.api
      .submitEnquiry({
        name: name.trim(),
        email: email.trim(),
        mobile: mobile.trim() || null,
        subject: subject.trim(),
        message: message.trim(),

        /*
          🔒 Sent through UNTOUCHED, whatever is in it. Filtering it here would
          defeat the trap: the server is what must see a filled honeypot.
        */
        website,
      })
      .subscribe({
        next: () => {
          this.state.set('sent');

          /*
            ⚠️ Reset AFTER success only. Clearing the fields on a failure would
            destroy what they wrote — and the mailto: fallback needs it to
            prefill the email.
          */
          this.form.reset();
        },

        error: (error: { status?: number; error?: { errors?: Record<string, string[]> } }) => {
          this.state.set('failed');

          /*
            A 400 carries per-field messages in the envelope's `errors`, which
            are shown beside the fields. Anything else — 429, 500, no network —
            leaves them empty and the template shows the general failure with
            the email address.
          */
          if (error?.status === 400 && error.error?.errors) {
            this.serverErrors.set(error.error.errors);
          }
        },
      });
  }
}

/** The API keys validation errors by PascalCase property name. */
function capitalise(field: string): string {
  return field.charAt(0).toUpperCase() + field.slice(1);
}
