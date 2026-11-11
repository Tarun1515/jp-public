/*==============================================================================
  WHICH OPTIONS A QUERY SHOWS, AND IN WHAT ORDER. P3b.

  ----------------------------------------------------------------------------
  ⚠️ NO ANGULAR IMPORTS IN THIS FILE, DELIBERATELY
  ----------------------------------------------------------------------------
  The ranking rule below is the one piece of this control that is a CLAIM
  rather than a rendering, and claims want a table test rather than a browser.
  So it lives in a file a plain `node` can import — the same reason
  jp-shared/core/utils/safe-internal-path.ts has no Angular imports, and the
  same way scripts/verify/safe-path.mjs reaches it.

  `scripts/verify/public-combobox.mjs` imports these two functions directly and
  runs the shared vectors (`scripts/verify/lib/combobox-vectors.mjs`) past them.
  If anything here ever grows an Angular dependency, that suite stops running
  and says so rather than quietly passing.

  ----------------------------------------------------------------------------
  🔴 PREFIX MATCHES RANK ABOVE SUBSTRING MATCHES — AND THE FILTER STAYS
     "CONTAINS"
  ----------------------------------------------------------------------------
  Typing "Har" into a state list that holds Bihar, Haryana, Jharkhand and
  Maharashtra used to offer them in the master's own order:

      Bi-har · Har-yana · J-har-khand · Ma-har-ashtra

  All four contain "har", and the first row is the one somebody presses — so
  the control was steering people to the wrong state.

  ⚠️ THE CHEAP FIX IS THE WRONG ONE, AND IT LOOKS RIGHT. Narrowing the filter
  to `startsWith` puts Haryana first and passes the obvious assertion, while
  silently breaking everyone who types the middle of a name: "aryan" would stop
  finding Haryana, and "chopta" would stop finding Nathusari Chopta. 902 towns
  are seeded (SR-1) and plenty of them are two words, so typing the second word
  is the normal case, not an edge one.

  So NOTHING IS FILTERED OUT by the ranking — only the order moves.
==============================================================================*/

/**
 * One row of a master, as this control takes it.
 *
 * ⚠️ TWO STRINGS, AND THE DIFFERENCE IS LOAD-BEARING. `label` is what a query
 * is matched against; `text` is what a reader sees. The public filters show a
 * live job count ("Mathematics (1)"), and that number must be VISIBLE without
 * being SEARCHABLE — matching against the rendered text would make typing "1"
 * surface every subject with one vacancy, which is not a thing anybody meant
 * to ask for.
 */
export interface ComboboxOption {
  /** The master id the URL carries, or null for the "any" row. */
  readonly value: number | null;

  /** Matched against the query. The bare name, no count. */
  readonly label: string;

  /** Rendered. The name plus its live count, when there is one. */
  readonly text: string;
}

/**
 * An option with its label already lowercased.
 *
 * 🔴 THE LOWERCASING IS WHY THIS TYPE EXISTS. See `prepareOptions`.
 */
export interface PreparedOption {
  readonly option: ComboboxOption;
  readonly needle: string;
}

/**
 * How many rows the open list paints at once.
 *
 * 🔴 THE CAP IS ABOUT THE DOM, NOT THE SEARCH. Comparing 902 short strings is
 * microseconds; creating 902 `<li>` elements and then diffing them again on
 * the next keystroke is what makes a type-ahead feel broken. 50 rows is more
 * than fits in the 15rem list, so capping costs the reader nothing they could
 * have seen without scrolling — and the overflow is STATED under the list
 * rather than silently dropped, because a list that is quietly truncated is a
 * list that lies about what the master holds.
 *
 * ⚠️ Exported so the suite asserts the rendered order against the same number
 * the component renders with, instead of hardcoding 50 in two places.
 */
export const RENDER_CAP = 50;

/**
 * Lowercases every label ONCE per options array, not once per keystroke.
 *
 * 🔴 THIS IS THE WHOLE PERFORMANCE STORY, AND IT IS ABOUT ALLOCATION RATHER
 * THAN COMPARISONS. Matching N options against a query is O(N) and cannot be
 * anything else — every candidate has to be looked at once. What is avoidable
 * is `label.toLowerCase()` inside the loop: 902 fresh strings allocated on
 * every single keystroke, which is the part that shows up as jank.
 *
 * ⚠️ CALL THIS FROM A `computed` KEYED ON THE OPTIONS INPUT, never from the
 * filter itself. A caller that re-prepares per keystroke has paid for the
 * cache and thrown it away.
 */
export function prepareOptions(options: readonly ComboboxOption[]): readonly PreparedOption[] {
  return options.map((option) => ({ option, needle: option.label.toLowerCase() }));
}

/**
 * The options a query shows, prefix matches first.
 *
 * ⚠️ ONE PASS, TWO BUCKETS, NO SORT. `indexOf` tells us "starts with" and
 * "contains" from a single scan of each needle, and appending to two arrays
 * that are then joined is stable by construction — so options that rank
 * equally keep the master's own order, which is what makes the result
 * predictable enough to write down as a test vector. A `sort` with a
 * comparator would be O(n log n) for an ordering this already has, and would
 * depend on the engine's sort being stable to get the same answer.
 *
 * An empty query returns everything, in the master's order: opening the list
 * and seeing the whole list is what a `<select>` does, and this control has to
 * keep doing it.
 */
export function rankOptions(
  prepared: readonly PreparedOption[],
  query: string,
): readonly ComboboxOption[] {
  const q = query.trim().toLowerCase();

  if (!q) {
    return prepared.map((p) => p.option);
  }

  const prefix: ComboboxOption[] = [];
  const inside: ComboboxOption[] = [];

  for (const { option, needle } of prepared) {
    const at = needle.indexOf(q);

    if (at === 0) {
      prefix.push(option);
    } else if (at > 0) {
      /* 🔴 KEPT, JUST LOWER. This branch is the "aryan finds Haryana" case. */
      inside.push(option);
    }
  }

  return [...prefix, ...inside];
}
