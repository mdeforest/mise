# Mise — Modern Heirloom Redesign

**Date:** 2026-03-20
**Status:** Approved
**Scope:** Full visual redesign of the Mise recipe app to match the "Add Recipe" Stitch design system ("Modern Heirloom" theme)

---

## 1. Overview

Mise is a mobile-first recipe capture and management app (Next.js 16.2, Tailwind CSS v4, React 19). The current design uses a utility-first Tailwind approach with a stone/emerald palette and Geist fonts. This redesign replaces it wholesale with the **Modern Heirloom** design system derived from the "Add Recipe" Stitch project.

The Modern Heirloom system evokes a premium culinary magazine — editorial serif typography, warm cream surfaces, deep terracotta accents, and depth created entirely through tonal color layering (no borders).

---

## 2. Implementation Approach

**Tailwind v4 `@theme` semantic tokens** — all design tokens defined once in `globals.css` as named Tailwind custom properties. Components use generated utility classes (`bg-primary`, `text-on-surface`, `font-display`, etc.). No separate component class layer.

### `@theme` vs `@theme inline` distinction

In Tailwind v4 there are two distinct directives:

- **`@theme`** (bare) — Tailwind emits the custom properties as declarations in `:root` and generates utility classes from them. Use this for all color tokens defined in this spec.
- **`@theme inline`** — Tailwind references an *existing* CSS variable (e.g., one injected by `next/font` onto the `<html>` element) rather than emitting it. Use this only for the font family tokens forwarded from `next/font/google`.

The `globals.css` token block is split into two declarations:

```css
/* Colors — Tailwind owns these values */
@theme {
  --color-primary: #9d3d2e;
  /* ... all color tokens */
}

/* Font families — reference variables injected by next/font on <html> */
@theme inline {
  --font-display: var(--font-newsreader);
  --font-body: var(--font-work-sans);
}
```

The current `@theme inline` block in `globals.css` (which defines `--color-background`, `--color-foreground`, `--font-sans`, `--font-mono`) is deleted entirely and replaced by the two new blocks above.

---

## 3. Design Tokens

### Colors

All defined in the bare `@theme` block.

| Token | Hex | Semantic Role |
|---|---|---|
| `--color-primary` | `#9d3d2e` | CTAs, active states |
| `--color-primary-container` | `#bd5444` | Gradient end for primary buttons |
| `--color-on-primary` | `#ffffff` | Text on primary backgrounds |
| `--color-surface` | `#fbf9f5` | Page background ("the paper") |
| `--color-surface-low` | `#f5f3ef` | Section containers (Level 1) |
| `--color-surface-lowest` | `#ffffff` | Cards, elevated containers (Level 2). Pure white is intentional — the elevated surface reads as a physical card lifted off the cream page. |
| `--color-surface-high` | `#eae8e4` | Inactive steppers, decorative wayfinder numerals |
| `--color-surface-highest` | `#e4e2de` | Input field backgrounds |
| `--color-on-surface` | `#1b1c1a` | Primary body text (charcoal — never pure black) |
| `--color-on-surface-variant` | `#56423e` | Secondary/metadata text |
| `--color-secondary` | `#655d56` | Secondary icons, timestamps |
| `--color-secondary-container` | `#eaddd5` | Secondary button backgrounds |
| `--color-on-secondary-container` | `#69615a` | Text on secondary buttons |
| `--color-tertiary` | `#006858` | Success states, dietary/health tags |
| `--color-on-tertiary` | `#ffffff` | Text on tertiary backgrounds |
| `--color-error` | `#ba1a1a` | Destructive actions |
| `--color-error-container` | `#ffdad6` | Error/warning surface backgrounds |
| `--color-on-error-container` | `#93000a` | Text on error surfaces |
| `--color-ghost-border` | `#ddc0bb` | Ghost border (used at 15–20% opacity only) |

Note: The token is named `--color-ghost-border` (not `outline-variant`) to avoid collision with Tailwind's `outline-*` utility namespace.

### Typography

Defined in the `@theme inline` block (references variables injected by `next/font` on `<html>`).

| Tailwind Token | CSS Variable Referenced | Role |
|---|---|---|
| `--font-display` | `var(--font-newsreader)` | Headlines, recipe titles, step wayfinders |
| `--font-body` | `var(--font-work-sans)` | Body text, ingredients, UI labels |

### Radii

Radius values are **not** added to `@theme` (they would generate unused `rounded-card` etc. utilities that conflict with Tailwind's default scale). Use standard Tailwind utilities that match the design values:

| Design Intent | Utility | Effective Value |
|---|---|---|
| Cards | `rounded-lg` | `0.5rem` |
| Buttons, tags, search | `rounded-full` | `9999px` |
| Text inputs, textareas | `rounded-xl` | `0.75rem` |

---

## 4. Global Styles

> **Dependency note:** Sections 4 and 7 must be applied together as a single atomic change — removing the `body {}` rule from `globals.css` and adding `className` to `<body>` in `layout.tsx` are two halves of the same operation. Applying one without the other will leave the app without body background or font styles.

The complete replacement for `globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-primary: #9d3d2e;
  --color-primary-container: #bd5444;
  --color-on-primary: #ffffff;
  --color-surface: #fbf9f5;
  --color-surface-low: #f5f3ef;
  --color-surface-lowest: #ffffff;
  --color-surface-high: #eae8e4;
  --color-surface-highest: #e4e2de;
  --color-on-surface: #1b1c1a;
  --color-on-surface-variant: #56423e;
  --color-secondary: #655d56;
  --color-secondary-container: #eaddd5;
  --color-on-secondary-container: #69615a;
  --color-tertiary: #006858;
  --color-on-tertiary: #ffffff;
  --color-error: #ba1a1a;
  --color-error-container: #ffdad6;
  --color-on-error-container: #93000a;
  --color-ghost-border: #ddc0bb;
}

@theme inline {
  --font-display: var(--font-newsreader);
  --font-body: var(--font-work-sans);
}
```

The existing `globals.css` content — the `:root` variable block, the old `@theme inline` block, the `body {}` styles, and the `@media (prefers-color-scheme: dark)` block — is removed entirely and replaced by the above. Body base styles move to `<body className=...>` in `layout.tsx` (see Section 7).

**No-Line Rule:** no `border` or `divide-*` utilities on structural elements anywhere in the app — all separation via background color tonal shifts. The one exception is the check indicator circle in the shopping list (a form affordance, not structural separation).

---

## 5. Component Specifications

### Buttons

**Primary**
- Shape: `rounded-full`
- Background: `bg-linear-to-br from-primary to-primary-container` (Tailwind v4 syntax — v3 equivalent was `bg-gradient-to-br`; bottom-right direction mimics light hitting a ceramic surface). Gradient stop utilities (`from-primary`, `to-primary-container`) are generated automatically from the `@theme` `--color-*` tokens.
- Text: `text-on-primary font-body font-medium text-sm`
- No border

**Secondary**
- Shape: `rounded-full`
- Background: `bg-secondary-container`
- Text: `text-on-secondary-container font-body font-medium text-sm`
- No border

**Ghost / Tertiary**
- `text-primary font-body font-medium text-sm`
- No background, no border
- Used for: Cancel, Back, low-priority actions

**Destructive**
- Shape: `rounded-full`
- Background: `bg-error-container`
- Text: `text-on-error-container font-body font-medium text-sm`
- No border
- Used for: "Clear all" on shopping list

Note: All existing buttons using `rounded-lg` are updated to `rounded-full` during migration.

### Inputs & Search

- Background: `bg-surface-highest`
- Border radius: `rounded-xl` (text inputs/textareas) or `rounded-full` (search bar)
- No border in default state
- Focus: background shifts to `bg-surface-lowest` + `outline-2 outline-offset-0 outline-ghost-border/20`
- Placeholder: `text-secondary`

### Cards

- Background: `bg-surface-lowest`
- Placed on `bg-surface-low` section — tonal contrast creates visual edge without borders
- Shadow: `shadow-[0_8px_32px_rgba(27,28,26,0.05)]` (ambient, diffuse)
- Border radius: `rounded-lg`

### Bottom Navigation

- Background: `bg-surface-lowest`
- No top border — remove existing `border-t border-stone-200`; tonal contrast with `bg-surface` page provides edge
- Active icon: `text-primary`
- Inactive icon: `text-secondary`

### Tags & Pills

- Dietary/health tags (Vegan, GF, etc.): `bg-tertiary text-on-tertiary rounded-full px-3 py-1 text-xs`
- Category tags: `bg-secondary-container text-on-secondary-container rounded-full px-3 py-1 text-xs`

### Scaling Stepper (`scale-control.tsx`)

The current implementation is `flex gap-2` with individual `rounded-lg` buttons. This structure changes:

- **New structure:** A single `rounded-full p-1 bg-surface-low` container wrapping pill segments (`flex`)
- Active segment: `bg-primary text-on-primary rounded-full`
- Inactive segment: `bg-surface-high text-on-surface-variant rounded-full`
- No borders, no gap between segments (contained within the pill wrapper)

### Instruction Step Wayfinders

- Large Newsreader numerals (`font-display text-8xl`) in `text-surface-high`
- Positioned `absolute` behind instruction text
- **Intent:** `text-surface-high` (`#eae8e4`) against the instructions container background (`bg-surface-low`, `#f5f3ef`) produces a subtle, washed-out numeral that provides visual rhythm without competing with the instruction text. This is intentional — do not substitute a more legible color.

### Check Indicators (Shopping List)

The shopping list uses a **custom circular check indicator** (a `<button>` containing a styled `<div>`) — not a native checkbox. `accent-primary` does not apply.

- Unchecked: `w-6 h-6 rounded-full border-2 border-secondary` (border is an exception to the no-line rule — form affordance)
- Checked: `w-6 h-6 rounded-full bg-primary` with a white checkmark SVG inside
- Checked item text: `text-secondary line-through`

### Warning / Incomplete Data Banner (Recipe Detail)

Remapped from `bg-amber-50 text-amber-700` to:

- `bg-error-container text-on-error-container rounded-xl`
- No border

---

## 6. Screen-by-Screen Layout

### Home (`/`)

- **Page wrapper** (`(app)/layout.tsx`): `min-h-screen bg-stone-50 pb-16` → `min-h-screen bg-surface pb-16` (preserve `pb-16` for bottom nav clearance)
- **Header:** The current `<h1>My Recipes</h1>` is replaced with "Mise" as the app wordmark in `font-display text-4xl`, left-aligned with editorial indent (`pl-6`). No subtitle.
- **Search:** full-width `bg-surface-highest rounded-full`, no border. Replaces existing search input which has `border border-stone-200`.
- **Recipe list:** wrapped in `bg-surface-low rounded-xl` section container
- **Recipe cards:** `bg-surface-lowest rounded-lg shadow-[0_8px_32px_rgba(27,28,26,0.05)]`, recipe title in `font-display`, metadata in `text-xs text-secondary`

### Add Recipe (`/add`)

- Page: `bg-surface`
- Section blocks: `bg-surface-low rounded-xl`, no borders
- URL input, text paste area: `bg-surface-highest`, no border, `rounded-xl`
- Submit: full-width primary pill gradient button
- Error states: `bg-error-container text-on-error-container rounded-xl` — no red borders

### Recipe Detail (`/recipes/[id]`)

- Hero title: `font-display text-6xl`, generous top margin, `pl-6` editorial indent
- Metadata row: `text-xs text-secondary`, dietary tags as tertiary green pills
- Incomplete data warning banner: `bg-error-container text-on-error-container rounded-xl` (replaces `bg-amber-50 text-amber-700`)
- Scaling stepper: `scale-control.tsx` updated per Section 5 — pill container `bg-surface-low rounded-full`
- Ingredients section: `bg-surface-low rounded-xl` container, `gap-4` spacing between items, uniform `bg-surface-low` background on all rows (no dividers, no zebra pattern — deferred to a future pass).
- Instructions section: `bg-surface-low rounded-xl` container. Each step has `relative` wrapper with `absolute` Newsreader numeral wayfinder (`font-display text-8xl text-surface-high`) behind the instruction text.
- Add to shopping list: secondary pill button

### Shopping List (`/shopping-list`)

- Page: `bg-surface`
- Items container: `bg-surface-low rounded-xl`, no borders
- Check indicator: custom circular button — unchecked `border-secondary`, checked `bg-primary` with white checkmark
- Checked items: `text-secondary line-through`
- "Clear checked": ghost/tertiary button (`text-primary`, no background)
- "Clear all": destructive button (`bg-error-container text-on-error-container rounded-full`)

### Auth Wrappers

- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`: change `<main className="... bg-stone-50 ...">` → `bg-surface`
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`: same change
- Clerk `<SignIn />` / `<SignUp />` widget unchanged (hosted UI)

---

## 7. Font Loading

> **Dependency note:** Apply Sections 4 and 7 together — see note in Section 4.

Only the `<html>` className and `<body>` className change in `layout.tsx`. All other existing content (`ClerkProvider`, `ServiceWorkerRegistration`, metadata exports, etc.) is preserved exactly.

```tsx
import { Newsreader, Work_Sans } from 'next/font/google'

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  style: ['normal', 'italic'],
})

const workSans = Work_Sans({
  subsets: ['latin'],
  variable: '--font-work-sans',
})

// In the RootLayout JSX — only these two elements change:
<html lang="en" className={`${newsreader.variable} ${workSans.variable}`}>
  <body className="font-body bg-surface text-on-surface antialiased">
    {/* ClerkProvider, ServiceWorkerRegistration, and all other children unchanged */}
  </body>
</html>
```

The `variable` names (`--font-newsreader`, `--font-work-sans`) are injected by `next/font` onto `<html>`. The `@theme inline` block in `globals.css` maps them to Tailwind's `--font-display` and `--font-body` tokens, generating the `font-display` and `font-body` utility classes.

---

## 8. Migration Checklist

### `src/app/globals.css`
- [ ] Replace entire file contents with the token blocks from Section 4 (removes `:root` block, old `@theme inline`, `body {}` styles, dark mode media query)

### `src/app/layout.tsx`
- [ ] Add `className={`${newsreader.variable} ${workSans.variable}`}` to `<html>` element
- [ ] Update `<body>` className to `font-body bg-surface text-on-surface antialiased`
- [ ] Preserve everything else (ClerkProvider, ServiceWorkerRegistration, metadata). Note: `layout.tsx` currently has no font imports — the font setup in this spec is purely additive.

### `src/app/(app)/layout.tsx`
- [ ] Update wrapper `<div>` from `min-h-screen bg-stone-50 pb-16` → `min-h-screen bg-surface pb-16`

### `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
- [ ] Update `<main>` background from `bg-stone-50` → `bg-surface`

### `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`
- [ ] Update `<main>` background from `bg-stone-50` → `bg-surface`

### `src/components/bottom-nav.tsx`
- [ ] Remove `border-t border-stone-200`
- [ ] Update background from `bg-white` to `bg-surface-lowest`
- [ ] Update active icon color: `emerald-*` → `text-primary`
- [ ] Update inactive icon color → `text-secondary`

### `src/components/scale-control.tsx`
- [ ] Change the container `<div>` from `flex gap-2` to `flex rounded-full p-1 bg-surface-low`
- [ ] Update each segment `<button>` className to `flex-1 rounded-full py-2 text-sm font-medium transition-colors`
- [ ] Active segment: add `bg-primary text-on-primary`
- [ ] Inactive segment: add `bg-surface-high text-on-surface-variant`

### All pages and components (global sweep)
- [ ] Replace all `stone-*` color references with semantic tokens
- [ ] Replace all `emerald-*` color references with `primary` tokens
- [ ] Replace all `amber-*` color references with `error-container` tokens
- [ ] Update all buttons with `rounded-lg` → `rounded-full`
- [ ] Remove all structural `border` and `divide-*` utilities (exception: check indicator circle in shopping list)

---

## 9. Out of Scope

- Clerk widget appearance customization (appearance prop)
- Dark mode
- Animation / transition design
- New features or route changes
