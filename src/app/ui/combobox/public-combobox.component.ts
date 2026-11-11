import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { ComboboxOption, RENDER_CAP, prepareOptions, rankOptions } from './combobox-rank';

/*==============================================================================
  A SEARCHABLE FILTER FOR THE PUBLIC SITE — A NATIVE <select> THAT UPGRADES
  ITSELF INTO A TYPE-AHEAD. P3b.

  ----------------------------------------------------------------------------
  🔴 THIS IS THE DECLARED TWIN OF jp-shared's `<ui-combobox>`
  ----------------------------------------------------------------------------
  G27 says there is ONE searchable select in this product. This is the SECOND
  one, on purpose, and it is written down here so that nobody finds it in six
  months and "fixes" it by deleting one of them.

      twin:  jp-shared/src/ui/ui-combobox/ui-combobox.component.ts

  WHY A SECOND COPY EXISTS HERE: jp-public is UNFEDERATED by decision 2.43.
  It is neither a federation host nor a remote, it has no `jp-shared` tsconfig
  path and no `federation.config.mjs`, and it imports no shared JavaScript at
  all — `public-api.service.ts` re-declares `ApiResponse<T>` rather than
  importing it, and the 404 page is hand-written here, both for that one
  reason: the public site must build and deploy on its own. Design tokens
  arrive through a build-time SCSS include path; nothing else crosses. So
  `<ui-combobox>` cannot be imported, and the client's complaint — 900+ towns
  in a native dropdown, on the most public surface the product has — is real
  and could not wait for a federation decision.

  WHAT MUST STAY IN STEP, AND WHAT MAY DIVERGE:

    IN STEP — asserted, not trusted. The filtering and ranking rule is held as
    DATA in ONE file that BOTH components' suites run:

        jp-docs/scripts/verify/lib/combobox-vectors.mjs

    jp-shared's side runs it from `combobox-rank.mjs`; this side runs it from
    `public-combobox.mjs` against `./combobox-rank.ts` directly. Change the
    rule in either component and the OTHER repo's suite goes red. Add a case
    to the vectors and both sides have to answer it. Also in step: the ARIA
    contract (`role="combobox"` with aria-expanded/-controls/-activedescendant
    over a `role="listbox"` of `role="option"`) and the keys — arrows move,
    Enter selects, Escape closes.

    MAY DIVERGE — declared, so a reviewer does not read these as drift:
      1. This one renders a real `<select>` first and upgrades after hydration.
         jp-shared has no SSR to serve and needs none of that machinery.
      2. No `searchFrom` threshold here. jp-shared hides its search box below 8
         options because its callers include four-row masters inside forms;
         these four filters are the long-tail ones (902 towns, 36 states) and a
         control whose keyboard behaviour changes when a master grows is worse
         than one that always behaves the same way.
      3. No ControlValueAccessor. This takes a value and emits one; the URL is
         the form on this page (see JobListComponent).
      4. The open list is in NORMAL FLOW here — absolutely positioned inside a
         relative wrapper. jp-shared's is `position: fixed` because it has to
         escape `ui-modal`'s scrolling body. See the stylesheet for why copying
         that here would import a bug rather than a feature.
      5. The list paints at most RENDER_CAP rows and says so underneath.
      6. No clear "×" button: the first row of the list is "Any subject", which
         is how a FILTER is cleared, and the filter bar has its own Clear.

  ----------------------------------------------------------------------------
  🔴 THE SERVER SENDS A REAL <select> WITH EVERY OPTION IN IT
  ----------------------------------------------------------------------------
  That is the point of the whole component, not an implementation detail:

    - with JavaScript off the filters WORK. The form is a real GET to /jobs,
      the selects carry `name`, and the server renders the filtered page.
    - a crawler is served the option text as HTML.
    - the 7A bar (Lighthouse SEO and accessibility at 100/100) is held by the
      same `<label for>`/`id` pair the plain select had, before and after the
      upgrade.

  ⚠️ `afterNextRender`, NOT `isPlatformBrowser`. Both are "are we in a
  browser?", and only one of them is also "is hydration finished?". Deciding at
  construction time renders the combobox on the client's FIRST pass while the
  server sent a `<select>` — a hydration mismatch (NG0500), which Angular
  recovers from by destroying and re-creating the subtree. It would appear to
  work. `afterNextRender` runs once, in the browser only, after that first
  render has been reconciled, so the swap is an ordinary DOM update of a
  subtree Angular already owns.

  ⚠️ THE PRICE, STATED: arriving at /jobs by a router link rather than by
  typing the URL paints the native select for the frame before the hook runs.
  Both renderings are a `.form-control` box with a chevron, so it reads as a
  chevron changing shape rather than as a control being replaced — and the
  alternative is branching on the platform, which is the bug above.
==============================================================================*/
@Component({
  selector: 'app-combobox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './public-combobox.component.html',
  styleUrl: './public-combobox.component.scss',
})
export class PublicComboboxComponent {
  /** The visible label. A filter with no name is a filter nobody can describe. */
  readonly label = input.required<string>();

  /**
   * The id of the control itself.
   *
   * 🔴 SUPPLIED BY THE CALLER, NOT GENERATED. jp-shared's combobox owns its own
   * id, which is why it needed an `ariaLabel` input — an outside `<label for>`
   * cannot point at an id it does not know. Here the page keeps the id it
   * already had (`filter-subject`, `filter-city`, …), so the label association
   * survives the conversion, the id is the same before and after the upgrade,
   * and the browser suites keep one stable handle on the control.
   */
  readonly controlId = input.required<string>();

  /**
   * The query-string parameter this filter sets — and the `name` of the native
   * select, which is what makes the no-JS GET submit carry it.
   */
  readonly name = input.required<string>();

  /** The "no filter" row: "Any subject", "Any state". */
  readonly anyLabel = input.required<string>();

  /**
   * ⚠️ MUST BE A `computed`, NOT A FRESH ARRAY PER CHANGE DETECTION. Every
   * keystroke-cheap thing here hangs off the options array's identity:
   * `prepared()` re-lowercases 902 labels when it changes, and `@for` re-keys
   * its rows. A getter that rebuilt the array would do both on every tick.
   */
  readonly options = input<readonly ComboboxOption[]>([]);

  /** The applied value — on this page, read back out of the URL. */
  readonly value = input<number | null>(null);

  /** The chosen master id, or null for "any". */
  readonly valueChange = output<number | null>();

  /**
   * false until hydration has finished, and false on the server for ever.
   * See the header: this is the progressive enhancement, in one signal.
   */
  protected readonly upgraded = signal(false);

  protected readonly open = signal(false);
  protected readonly query = signal('');
  protected readonly activeIndex = signal(-1);

  private readonly list = viewChild<ElementRef<HTMLUListElement>>('list');

  /** Lowercased once per options array. See `prepareOptions`. */
  private readonly prepared = computed(() => prepareOptions(this.options()));

  protected readonly selected = computed(() =>
    this.options().find((o) => o.value === this.value()) ?? null);

  private readonly noneRow = computed<ComboboxOption>(() => ({
    value: null,
    label: this.anyLabel(),
    text: this.anyLabel(),
  }));

  /**
   * What the open list paints, and how much it is not painting.
   *
   * ⚠️ ONE computed, not two. `rows` and `hidden` are both answers from the
   * same ranking pass, and splitting them into two computeds would rank 902
   * options twice per keystroke to save a property access.
   *
   * ⚠️ EMPTY WHILE CLOSED, deliberately: a closed control holds no `<li>` at
   * all, so the 902-row case costs nothing until somebody opens it.
   */
  private readonly view = computed<{
    rows: readonly ComboboxOption[];
    painted: number;
    hidden: number;
  }>(() => {
    if (!this.open()) {
      return { rows: [], painted: 0, hidden: 0 };
    }

    const typed = this.query().trim();
    const ranked = rankOptions(this.prepared(), typed);
    const painted = ranked.length > RENDER_CAP ? ranked.slice(0, RENDER_CAP) : ranked;

    return {
      /*
        The "any" row is offered while nothing is typed and withdrawn once
        something is: it is how a filter is CLEARED, not something anybody
        searches for — and leaving it in the filtered list would make
        "a query that matches nothing" show one option that matches nothing.
      */
      rows: typed ? painted : [this.noneRow(), ...painted],

      /*
        ⚠️ COUNTED SEPARATELY FROM `rows`, because `rows` may carry the "any"
        row and the overflow message is about MASTER rows. "Showing the first
        51 of 902" was the off-by-one that reading it out loud catches.
      */
      painted: painted.length,
      hidden: ranked.length - painted.length,
    };
  });

  protected readonly rows = computed(() => this.view().rows);

  protected readonly paintedCount = computed(() => this.view().painted);

  protected readonly hiddenCount = computed(() => this.view().hidden);

  /** Everything the query matched, painted or not. */
  protected readonly matchCount = computed(() => this.view().painted + this.view().hidden);

  /**
   * 🔴 `aria-expanded` TRACKS THE LIST, NOT THE FOCUS. With a query that
   * matches nothing there is no listbox on screen, and saying "expanded" about
   * a popup that is not there is exactly the kind of aria that contradicts
   * what a screen-reader user then cannot find. The "no match" line below the
   * field is what speaks instead, through its own `role="status"`.
   */
  protected readonly expanded = computed(() => this.open() && this.rows().length > 0);

  /** What the input shows: the query while open, the chosen option while not. */
  protected readonly display = computed(() =>
    this.open() ? this.query() : this.selected()?.text ?? '');

  protected readonly listId = computed(() => `${this.controlId()}-list`);

  protected optionId(index: number): string {
    return `${this.controlId()}-opt-${index}`;
  }

  constructor() {
    /* The upgrade. One line, and the header explains why it is this hook. */
    afterNextRender(() => this.upgraded.set(true));

    /**
     * ⚠️ KEEPING THE ACTIVE ROW IN VIEW IS NOT COSMETIC HERE. The list scrolls
     * at 15rem and paints up to RENDER_CAP rows, so on the city filter the
     * arrow keys walk the highlight straight out of the visible box — the
     * keyboard user is then moving a selection they cannot see.
     *
     * ⚠️ `afterRenderEffect`'s READ phase, not a plain `effect`. A plain effect
     * runs during change detection, BEFORE the row it is looking for has been
     * rendered, so the first ArrowDown after the list opens would find nothing.
     */
    afterRenderEffect({
      read: () => {
        const index = this.activeIndex();

        if (!this.expanded() || index < 0) {
          return;
        }

        this.list()?.nativeElement.children.item(index)?.scrollIntoView({ block: 'nearest' });
      },
    });
  }

  /**
   * The native select, for the window between first paint and hydration — and
   * for any visitor whose JavaScript never arrives but whose page is
   * interactive enough to fire a change event.
   */
  protected onNativeChange(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;

    this.valueChange.emit(raw ? Number(raw) : null);
  }

  protected onFocus(): void {
    this.open.set(true);
    this.query.set('');

    /*
      ⚠️ THE ACTIVE ROW STARTS ON WHAT IS ALREADY CHOSEN, not at the top.
      Reopening a filled filter and pressing Enter must not quietly change it
      to the first row in the list.
    */
    this.activeIndex.set(this.rows().findIndex((o) => o.value === this.value()));
  }

  protected onInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.open.set(true);
    this.activeIndex.set(this.rows().length ? 0 : -1);
  }

  /**
   * ⚠️ THE VALUE IS NOT CLEARED HERE. Typing two letters and clicking away
   * must leave the chosen filter alone — the query is scratch state, not the
   * value. The input is painted from `display()`, so it snaps back to the
   * chosen option's text on its own.
   */
  protected onBlur(): void {
    this.open.set(false);
    this.query.set('');
    this.activeIndex.set(-1);
  }

  /**
   * ⚠️ NO `blur()` HERE. jp-shared's twin blurs its field after choosing, to
   * stop its own focus handler reopening the list. This one does not need to:
   * closing is enough, and dropping the keyboard user back onto the body in
   * the middle of a filter bar is a worse answer than leaving them on the
   * control they just used.
   */
  protected choose(option: ComboboxOption): void {
    this.open.set(false);
    this.query.set('');
    this.activeIndex.set(-1);
    this.valueChange.emit(option.value);
  }

  /**
   * 🔴 EVERY BRANCH READS `rows()` AFTER IT HAS SET `open`, AND THAT ORDER IS
   * THE BUG THIS COMMENT EXISTS TO STOP SOMEBODY REINTRODUCING.
   *
   * `rows()` returns NOTHING while the control is closed — deliberately, so a
   * closed city filter holds no DOM — which is the one way this differs from
   * jp-shared's twin, whose `visible()` does not depend on its open state. So
   * hoisting `const rows = this.rows()` to the top of this method (which is
   * what the twin does, correctly, there) reads an empty list on the keypress
   * that OPENS the control: the first ArrowDown would open the list and
   * highlight nothing, and the user would have to press it twice.
   */
  protected onKey(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        this.open.set(true);

        const rows = this.rows();

        this.activeIndex.set(rows.length ? (this.activeIndex() + 1) % rows.length : -1);
        break;
      }

      case 'ArrowUp': {
        event.preventDefault();
        this.open.set(true);

        const rows = this.rows();

        this.activeIndex.set(rows.length ? (this.activeIndex() - 1 + rows.length) % rows.length : -1);
        break;
      }

      case 'Enter': {
        /*
          ⚠️ preventDefault ONLY when this control is actually using the key.
          This control sits inside the search `<form>`, and swallowing Enter
          unconditionally would stop the form being submitted from the
          keyboard — which, with the list closed, is exactly what pressing
          Enter in a filter bar is supposed to do.
        */
        const active = this.rows()[this.activeIndex()];

        if (this.expanded() && active) {
          event.preventDefault();
          this.choose(active);
        }

        break;
      }

      case 'Escape':
        if (this.open()) {
          event.preventDefault();
          this.open.set(false);
          this.query.set('');
          this.activeIndex.set(-1);
        }

        break;

      default:
        break;
    }
  }
}
