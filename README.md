# jp-public

The Staffroom India public marketing website. Angular 22, standalone components,
runs on **http://localhost:4500**, server-rendered.

> 🔴 **Read `../jp-docs/PROJECT_MEMORY.md` before doing any work here.**
> `jp-docs` must be cloned as a sibling of this repository. It holds every
> locked architectural decision. It is deliberately not copied into any other
> repo — three copies become three versions within a week.

---

## Prerequisites

| | |
|---|---|
| Node.js | 22+ (Angular 22 needs 20.19+) |
| .NET SDK | 8.0.x — for `jp-backend` |
| SQL Server | 2019, instance `localhost\TARUN`, Windows auth |

All seven repositories are cloned as **siblings**:

```
D:Projects├── jp-docs      ← read this first
├── jp-shared    the shared library
├── jp-admin     :4200
├── jp-school    :4300
├── jp-teacher   :4400
├── jp-public    :4500
└── jp-backend   both APIs + all database scripts
```

New machine? `cd jp-docs && npm run bootstrap` clones and installs the lot,
then prints what still needs doing by hand.

---

## Setup

### 1. Install

```bash
npm install
```

No registry token, no `.npmrc`, no `npm link`. There is no shared npm package
any more — see PROJECT_MEMORY decision 2.42.

### 2. ⚠️ This app is NOT federated — and that is deliberate

`jp-admin`, `jp-school` and `jp-teacher` are Module Federation hosts: they load
their components at runtime from `jp-shared` on :4999, and will not start
without it.

**This app does not.** It is a plain Angular SSR application. `npm start` is all
it needs — `jp-shared` does not have to be running.

The reason is simply that it imports **zero** shared JavaScript. Not one
TypeScript file in `src/` references `jp-shared`. Federating it would add the
es-module-shims polyfill, a startup round-trip before bootstrap, and a hard
runtime dependency on another server — in exchange for sharing nothing, while
complicating the SSR pipeline this site's SEO depends on.

> If that ever changes — if a page here genuinely needs `ui-table` or
> `AuthService` — revisit it as a decision, not as a quick import. Read 2.42
> first.

### 3. 🔴 It still shares the design system, at build time

```json
"stylePreprocessorOptions": {
  "includePaths": ["src/styles", "../jp-shared/src/styles"]
}
```

That is the same mechanism the three hosts use. SCSS is shared at **build**
time for all five projects; only JavaScript is shared at runtime, and only by
the hosts.

So the repos must be **siblings**:

```
D:\Projects\
├── jp-docs      ← read PROJECT_MEMORY.md first
├── jp-shared    the design system lives here
├── jp-admin     :4200
├── jp-school    :4300
├── jp-teacher   :4400
├── jp-public    :4500   ← you are here
└── jp-backend   both APIs + all database scripts
```

> ⚠️ **CI must check out `jp-shared` beside this repo** or the build fails on
> the first component stylesheet.

This app keeps a few partials of its own in `src/styles/` — `_layout.scss`,
`_typography.scss`, `_components.scss`, `_theme.scss` — because marketing pages
need looser layout rules than an application does. It holds **no tokens and no
mixins**: those come from `jp-shared` so there is one palette, not two.

> That was not always true. This site sat on the old blue `#2563eb` while the
> apps moved to the Register direction, and nothing failed to build. Do not
> reintroduce a local `_variables.scss`.

New machine? `cd jp-docs && npm run bootstrap` clones and installs all seven.

---

## Running

```bash
npm start              # http://localhost:4500
npm run build:prod
```

You also need `JP.Sso.Api` on :5199 from `jp-backend`:

```bash
cd ../jp-backend/JP.Sso.Api && dotnet run
```

> `npm start` refuses to move to a different port if 4400 is busy. That is
> deliberate: the API's CORS allow-list and `environment.ts` are both pinned to
> it, so on any other port the app loads and then every request fails. Stop
> whatever is holding the port rather than moving off it.

---

## What this is

The anonymous, server-rendered marketing site. **No login and no session** — it
never talks to the SSO API, so none of the account, guard or token machinery in
the other three apps applies here.

It keeps its own lighter set of SCSS partials rather than importing the app
design system: a marketing page has a different type scale and needs none of
the 17 ui-* components.

```bash
npm start                 # http://localhost:4500
npm run build:prod        # SSR build
```
