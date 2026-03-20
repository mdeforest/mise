# Mise Modern Heirloom Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Mise's stone/emerald utility styling with the Modern Heirloom design system — Newsreader/Work Sans fonts, terracotta/cream palette, no-border tonal-layer depth — derived from the "Add Recipe" Stitch design.

**Architecture:** All design tokens live in a single `@theme` block in `globals.css`, generating Tailwind utility classes (`bg-primary`, `text-on-surface`, etc.) used across every component. Font variables are injected by `next/font/google` onto `<html>` and forwarded via a separate `@theme inline` block.

**Tech Stack:** Next.js 16.2, Tailwind CSS v4, React 19, `next/font/google` (Newsreader + Work Sans)

**Spec:** `docs/superpowers/specs/2026-03-20-mise-modern-heirloom-redesign-design.md`

---

## File Map

| File | Change Type | Description |
|---|---|---|
| `src/app/globals.css` | Replace | Entire file replaced with new `@theme` token blocks |
| `src/app/layout.tsx` | Modify | Add font imports; add className to `<html>` and `<body>` |
| `src/app/(app)/layout.tsx` | Modify | `bg-stone-50` → `bg-surface` on wrapper div |
| `src/components/bottom-nav.tsx` | Modify | Remove border, update colors to semantic tokens |
| `src/components/scale-control.tsx` | Modify | Restructure from `flex gap-2` to pill container |
| `src/components/recipe-card.tsx` | Modify | Update card styling, fonts, colors |
| `src/components/import-form.tsx` | Modify | Update tab switcher, inputs, buttons, error state |
| `src/components/shopping-list-view.tsx` | Modify | Update check indicators, buttons, containers, colors |
| `src/app/(app)/page.tsx` | Modify | Replace header, update search, wrap list in surface-low container |
| `src/app/(app)/add/page.tsx` | Modify | Update header and page wrapper |
| `src/app/(app)/recipes/[id]/page.tsx` | Modify | Major: title, wayfinders, ingredients, instructions, buttons |
| `src/app/(app)/shopping-list/page.tsx` | Modify | Update header |
| `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` | Modify | `bg-stone-50` → `bg-surface` |
| `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` | Modify | `bg-stone-50` → `bg-surface` |

---

## Task 1: Design System Foundation

**ATOMIC: Apply both file changes before committing.** Replacing `globals.css` without updating `layout.tsx` will leave the app with no body background or font. See spec Section 4 dependency note.

**Files:**
- Replace: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

### Why this approach
Tailwind v4 uses two distinct directives: `@theme` (bare) emits CSS custom properties to `:root` and generates utility classes; `@theme inline` references an existing variable injected by `next/font`. Colors go in bare `@theme`; font-family tokens go in `@theme inline` referencing the variables `next/font` injects on `<html>`. See spec Section 2 for full explanation.

- [ ] **Step 1: Replace `globals.css`**

Replace the entire file with:

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

- [ ] **Step 2: Update `layout.tsx`**

Add Newsreader and Work Sans font imports at the top. Update `<html>` to apply both font variables as classNames. Update `<body>` to use `font-body bg-surface text-on-surface antialiased`. Preserve `ClerkProvider`, `ServiceWorkerRegistration`, and metadata exactly as they are — the only changes are: two new import lines at the top, two new font config constants, and the className attributes on `<html>` and `<body>`.

Font config to add:
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
```

HTML element: `<html lang="en" className={`${newsreader.variable} ${workSans.variable}`}>`

Body element: `<body className="font-body bg-surface text-on-surface antialiased">`

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Visual check**

```bash
npm run dev
```

Open http://localhost:3000. Page background should be warm cream (`#fbf9f5`), body text charcoal (`#1b1c1a`), font should be Work Sans. Layout will look partially broken with old stone/emerald component colors still present — that's expected at this stage.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "feat(design): add Modern Heirloom token system and load Newsreader/Work Sans fonts"
```

---

## Task 2: App Layout + Auth Pages

Fast wins — pure background color swaps.

**Files:**
- Modify: `src/app/(app)/layout.tsx`
- Modify: `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
- Modify: `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`

- [ ] **Step 1: Update `(app)/layout.tsx`**

Change `min-h-screen bg-stone-50 pb-16` → `min-h-screen bg-surface pb-16` on the wrapper `<div>`. Preserve `<BottomNav />`.

- [ ] **Step 2: Update sign-in page**

Change `bg-stone-50` → `bg-surface` on the `<main>` element. Everything else (centering classes, `<SignIn />`) stays the same.

- [ ] **Step 3: Update sign-up page**

Change `bg-stone-50` → `bg-surface` on the `<main>` element. Everything else stays the same.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/layout.tsx src/app/(auth)/sign-in/[[...sign-in]]/page.tsx src/app/(auth)/sign-up/[[...sign-up]]/page.tsx
git commit -m "feat(design): update layout and auth page backgrounds to cream surface"
```

---

## Task 3: Bottom Navigation

**Files:**
- Modify: `src/components/bottom-nav.tsx`

Current: `border-t border-stone-200 bg-white` on `<nav>`, active `text-emerald-600`, inactive `text-stone-500`.
Target: `bg-surface-lowest` (no border), active `text-primary`, inactive `text-secondary`.

- [ ] **Step 1: Update `bottom-nav.tsx`**

On the `<nav>` element: remove `border-t border-stone-200`, change `bg-white` → `bg-surface-lowest`.

On the `<Link>` element's conditional className:
- `text-emerald-600` → `text-primary`
- `text-stone-500` → `text-secondary`

- [ ] **Step 2: Visual check**

Bottom nav should have no visible top separator. Active icon is terracotta, inactive is stone. Tonal difference between `bg-surface-lowest` nav and `bg-surface` page background provides the visual edge.

- [ ] **Step 3: Commit**

```bash
git add src/components/bottom-nav.tsx
git commit -m "feat(design): restyle bottom nav — remove border, apply Modern Heirloom tokens"
```

---

## Task 4: Scale Control (Stepper)

**Files:**
- Modify: `src/components/scale-control.tsx`

Current: `<div className="flex gap-2">` wrapper with individual `rounded-lg` buttons.
Target: `<div className="flex rounded-full p-1 bg-surface-low">` wrapper with `rounded-full` pill segments.

Only modify the `ScaleControl` component JSX. The `scaleQuantity` function and all exports are untouched.

- [ ] **Step 1: Update the container div**

`flex gap-2` → `flex rounded-full p-1 bg-surface-low`

- [ ] **Step 2: Update each button**

`flex-1 rounded-lg py-2 text-sm font-medium transition-colors` stays, change `rounded-lg` → `rounded-full`.

Active state: `bg-emerald-500 text-white` → `bg-primary text-on-primary`

Inactive state: `bg-stone-100 text-stone-600` → `bg-surface-high text-on-surface-variant`

- [ ] **Step 3: Visual check**

Stepper should look like a single pill capsule with four segments inside. Active segment is terracotta, inactive is warm grey. No visible gaps between segments.

- [ ] **Step 4: Commit**

```bash
git add src/components/scale-control.tsx
git commit -m "feat(design): restyle scale stepper as pill container with Modern Heirloom tokens"
```

---

## Task 5: Recipe Card

**Files:**
- Modify: `src/components/recipe-card.tsx`

Current: `rounded-xl bg-white p-3 shadow-sm` card link, `bg-stone-100` thumbnail placeholder, `text-stone-900` title, `text-stone-500` domain.
Target: `rounded-lg bg-surface-lowest shadow-[0_8px_32px_rgba(27,28,26,0.05)]`, `bg-surface-high` thumbnail placeholder, `font-display text-on-surface` title, `text-secondary` domain.

- [ ] **Step 1: Update `recipe-card.tsx`**

On the `<Link>` wrapper:
- `rounded-xl bg-white shadow-sm` → `rounded-lg bg-surface-lowest shadow-[0_8px_32px_rgba(27,28,26,0.05)]`

On the thumbnail placeholder `<div>`:
- `bg-stone-100` → `bg-surface-high`

On the title `<p>`:
- `font-semibold text-stone-900` → `font-display font-normal text-on-surface`

On the domain `<p>`:
- `text-stone-500` → `text-secondary`

- [ ] **Step 2: Commit**

```bash
git add src/components/recipe-card.tsx
git commit -m "feat(design): restyle recipe card — ambient shadow, Newsreader title, semantic tokens"
```

---

## Task 6: Import Form

**Files:**
- Modify: `src/components/import-form.tsx`

Changes:
- Tab switcher: `bg-stone-100` container → `bg-surface-low rounded-full`, active tab `bg-white text-stone-900` → `bg-surface-lowest text-on-surface`, inactive `text-stone-500` → `text-secondary`
- URL input + textarea: remove `border border-stone-200`, change `bg-white` → `bg-surface-highest`, update focus from `focus:border-emerald-500` to `focus:bg-surface-lowest focus:outline-2 focus:outline-offset-0 focus:outline-ghost-border/20`
- Submit button: `bg-emerald-500` → `bg-linear-to-br from-primary to-primary-container`, `rounded-xl` → `rounded-full`
- Error message: `bg-red-50 text-red-600 rounded-lg` → `bg-error-container text-on-error-container rounded-xl`
- All `text-stone-900` → `text-on-surface`, `placeholder` classes use `placeholder:text-secondary`

Note: `bg-linear-to-br` is the Tailwind v4 syntax for a diagonal gradient. The v3 equivalent was `bg-gradient-to-br`.

- [ ] **Step 1: Update the tab switcher container**

`flex rounded-xl bg-stone-100 p-1` → `flex rounded-full bg-surface-low p-1`

- [ ] **Step 2: Update tab buttons**

Active: `bg-white text-stone-900 shadow-sm` → `bg-surface-lowest text-on-surface shadow-sm`

Inactive: `text-stone-500` → `text-secondary`

- [ ] **Step 3: Update URL input**

Remove `border border-stone-200`. Change `bg-white` → `bg-surface-highest`. Replace `text-stone-900` with `text-on-surface`. Add `placeholder:text-secondary`. Replace `focus:border-emerald-500` with `focus:bg-surface-lowest focus:outline-2 focus:outline-offset-0 focus:outline-ghost-border/20 transition-colors`.

- [ ] **Step 4: Update textarea**

Same changes as Step 3.

- [ ] **Step 5: Update error paragraph**

`rounded-lg bg-red-50 text-red-600` → `rounded-xl bg-error-container text-on-error-container`

- [ ] **Step 6: Update submit button**

`rounded-xl bg-emerald-500 text-white` → `rounded-full bg-linear-to-br from-primary to-primary-container text-on-primary`

- [ ] **Step 7: Visual check**

Tab switcher is a pill. Inputs: warm grey fill, no border, faint terracotta outline on focus. Submit: terracotta gradient pill. Error: warm pink container instead of red.

- [ ] **Step 8: Commit**

```bash
git add src/components/import-form.tsx
git commit -m "feat(design): restyle import form — pill tabs, borderless inputs, gradient CTA"
```

---

## Task 7: Shopping List View

**Files:**
- Modify: `src/components/shopping-list-view.tsx`

Changes:
- Unchecked item rows: `bg-white` → `bg-surface-lowest`
- Checked item rows: `bg-stone-50` → `bg-surface-low`
- Unchecked circle: `border-stone-300` → `border-secondary`
- Checked circle: `bg-emerald-500` → `bg-primary`, checkmark SVG `text-white` → `text-on-primary`
- Checked item text: `text-stone-400` → `text-secondary`
- Clear checked button: `bg-stone-100 text-stone-600 rounded-lg` → ghost: just `text-primary rounded-full` (no background)
- Clear all button: `bg-red-50 text-red-600 rounded-lg` → `bg-error-container text-on-error-container rounded-full`
- Empty state: `text-stone-400` → `text-secondary`
- "Checked" section label: `text-stone-400` → `text-secondary`
- Unchecked item `text-stone-900` → `text-on-surface`; `text-stone-400` quantity prefix → `text-secondary`

- [ ] **Step 1: Update empty state**

`text-stone-400` → `text-secondary`

- [ ] **Step 2: Update action buttons**

Clear checked: `rounded-lg bg-stone-100 px-4 py-2 text-sm font-medium text-stone-600` → `rounded-full px-4 py-2 text-sm font-medium text-primary`

Clear all: `rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600` → `rounded-full bg-error-container px-4 py-2 text-sm font-medium text-on-error-container`

- [ ] **Step 3: Update unchecked item rows**

Row button: `bg-white` → `bg-surface-lowest`

Check circle div: `border-stone-300` → `border-secondary`

Item text `text-stone-900` → `text-on-surface`

Quantity prefix `text-stone-400` → `text-secondary`

- [ ] **Step 4: Update checked items section**

Section label: `text-stone-400` → `text-secondary`

Row button: `bg-stone-50` → `bg-surface-low`

Check circle div: `bg-emerald-500` → `bg-primary`

Checkmark SVG: `text-white` → `text-on-primary`

Item text `text-stone-400` stays as strikethrough — change to `text-secondary`

- [ ] **Step 5: Visual check**

Unchecked rows are white on cream background. Checked rows are slightly warm grey. Check indicator is terracotta when checked. "Clear checked" is bare terracotta text. "Clear all" is a warm pink pill.

- [ ] **Step 6: Commit**

```bash
git add src/components/shopping-list-view.tsx
git commit -m "feat(design): restyle shopping list — semantic tokens, Modern Heirloom check indicator"
```

---

## Task 8: Home Page

**Files:**
- Modify: `src/app/(app)/page.tsx`

Changes:
- `<h1>My Recipes</h1>` with `text-2xl font-bold text-stone-900` → "Mise" wordmark with `font-display text-4xl text-on-surface pl-6` (editorial left indent, no subtitle)
- Search input: remove `border border-stone-200`, change `bg-white` → `bg-surface-highest`, `rounded-full`, remove `focus:border-emerald-500`, add focus outline, add `placeholder:text-secondary`
- Recipe list: wrap in `rounded-xl bg-surface-low px-4 py-4` container
- Loading/empty state: `text-stone-400` → `text-secondary`
- Main element: `px-4 pt-6` → `pt-8 pb-6` (padding moved to children for asymmetric layout)

- [ ] **Step 1: Update the header**

Replace `<h1 className="mb-4 text-2xl font-bold text-stone-900">My Recipes</h1>` with:

```tsx
<h1 className="mb-6 pl-6 font-display text-4xl text-on-surface">Mise</h1>
```

- [ ] **Step 2: Update the search input**

Remove `border border-stone-200`. Change `bg-white` → `bg-surface-highest`. Add `rounded-full` (currently `rounded-xl`). Replace `focus:border-emerald-500` with `focus:bg-surface-lowest focus:outline-2 focus:outline-offset-0 focus:outline-ghost-border/20`. Add `placeholder:text-secondary`. Change `text-stone-900` → `text-on-surface`. Wrap in a `px-4` div for consistent margin.

- [ ] **Step 3: Wrap recipe list in surface-low container**

Wrap the loading/empty/list conditional in `<div className="rounded-xl bg-surface-low px-4 py-4">`. Update `text-stone-400` empty/loading text → `text-secondary`.

- [ ] **Step 4: Update main element padding**

`mx-auto max-w-lg px-4 pt-6` → `mx-auto max-w-lg pt-8 pb-6` (px-4 moves to individual children for the asymmetric header indent).

- [ ] **Step 5: Visual check**

"Mise" in Newsreader serif at top, slightly indented. Pill search below. Recipe cards sit inside a warm grey rounded container. Tonal lift makes cards appear to float.

- [ ] **Step 6: Commit**

```bash
git add src/app/(app)/page.tsx
git commit -m "feat(design): restyle home page — Mise wordmark, pill search, tonal card container"
```

---

## Task 9: Add Recipe Page

**Files:**
- Modify: `src/app/(app)/add/page.tsx`

- [ ] **Step 1: Update `add/page.tsx`**

Update header from `<h1 className="mb-6 text-2xl font-bold text-stone-900">Add Recipe</h1>` to `<h1 className="mb-6 pl-6 font-display text-4xl text-on-surface">Add Recipe</h1>`.

Update `<main>` padding from `mx-auto max-w-lg px-4 pt-6` → `mx-auto max-w-lg pt-8 pb-6`.

Wrap `<ImportForm />` in `<div className="rounded-xl bg-surface-low px-4 py-4">`.

- [ ] **Step 2: Commit**

```bash
git add src/app/(app)/add/page.tsx
git commit -m "feat(design): restyle add recipe page — Newsreader header, surface-low form container"
```

---

## Task 10: Shopping List Page

**Files:**
- Modify: `src/app/(app)/shopping-list/page.tsx`

- [ ] **Step 1: Update `shopping-list/page.tsx`**

Update header from `<h1 className="mb-4 text-2xl font-bold text-stone-900">Shopping List</h1>` to `<h1 className="mb-6 pl-6 font-display text-4xl text-on-surface">Shopping List</h1>`.

Update `<main>` padding from `mx-auto max-w-lg px-4 pt-6` → `mx-auto max-w-lg pt-8 pb-6`.

Wrap `<ShoppingListView />` in `<div className="rounded-xl bg-surface-low px-4 py-4">`.

- [ ] **Step 2: Commit**

```bash
git add src/app/(app)/shopping-list/page.tsx
git commit -m "feat(design): restyle shopping list page — Newsreader header, surface-low container"
```

---

## Task 11: Recipe Detail Page

Most involved task. Changes: hero title in Newsreader, wayfinder numerals on instructions, semantic tokens throughout, ingredient/instruction section containers, updated buttons.

**Files:**
- Modify: `src/app/(app)/recipes/[id]/page.tsx`

- [ ] **Step 1: Update loading/not-found states**

`text-stone-400` → `text-secondary` in both early-return paragraphs.

- [ ] **Step 2: Update the back button**

`text-sm text-stone-500` → `text-sm font-medium text-primary`

- [ ] **Step 3: Update the hero title**

`text-2xl font-bold text-stone-900` → `font-display text-6xl leading-tight text-on-surface pl-6`

Add top padding on the `<main>`: `pt-6` → `pt-0` (back button provides top spacing; title needs room to breathe).

Update `<main>` from `mx-auto max-w-lg px-4 pt-6 pb-8` → `mx-auto max-w-lg pb-8`.

Add a top padding div: `<div className="px-4 pt-6">` around the back button.

- [ ] **Step 4: Update the source link**

`text-sm text-emerald-600` → `text-sm font-medium text-primary`, add `pl-6` to match title indent.

- [ ] **Step 5: Update the warning banner**

`rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700` → `rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container mx-4`

- [ ] **Step 6: Update the servings section**

`font-semibold text-stone-700` → `text-sm font-medium uppercase tracking-wide text-secondary`

Servings span: `text-sm text-stone-500` → `text-sm text-secondary`

Wrap in `<section className="mb-6 px-4">`.

- [ ] **Step 7: Update the ingredients section**

Section header `font-semibold text-stone-700` → `text-sm font-medium uppercase tracking-wide text-secondary mb-3`

Wrap the `<ul>` in `<div className="rounded-xl bg-surface-low px-4 py-3">`.

List items: `text-stone-800` → `text-on-surface`. Quantity span `text-stone-400` → `text-secondary`. Change `gap-2` → `gap-4`.

Wrap section in `<section className="mb-4 px-4">`.

- [ ] **Step 8: Update the "Add to Shopping List" button**

`mb-6 w-full rounded-xl bg-stone-100 py-3 font-medium text-stone-700` → `w-full rounded-full bg-secondary-container py-3 font-medium text-on-secondary-container`

Wrap in `<div className="mb-6 px-4">`.

- [ ] **Step 9: Update the instructions section**

Section header `font-semibold text-stone-700` → `text-sm font-medium uppercase tracking-wide text-secondary mb-3`

Wrap the `<ol>` in `<div className="rounded-xl bg-surface-low px-4 py-4">`. Change `gap-4` → `gap-8`.

Replace the existing step render (numbered circle + text side-by-side) with the wayfinder pattern:

Each `<li>` becomes `<li key={step.id} className="relative pl-2">` containing:

1. A wayfinder `<span>` (absolute-positioned, aria-hidden):
```tsx
<span
  className="absolute -top-4 -left-2 font-display text-8xl leading-none text-surface-high select-none pointer-events-none"
  aria-hidden="true"
>
  {step.order}
</span>
```

2. The instruction `<p>` (relative, so it layers above the wayfinder):
```tsx
<p className="relative text-on-surface leading-relaxed">{step.text}</p>
```

The wayfinder color `text-surface-high` (`#eae8e4`) against `bg-surface-low` (`#f5f3ef`) is intentionally near-invisible — provides rhythm without distracting from the instruction text.

Wrap section in `<section className="px-4">`.

- [ ] **Step 10: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 11: Visual check**

Hero recipe title is very large Newsreader serif, left-indented. Ingredients sit in a warm grey rounded container with spacious gap. Instructions show faint huge numerals behind each step (barely visible against the background). Scale stepper is a pill. "Add to Shopping List" is a warm beige secondary pill.

- [ ] **Step 12: Commit**

```bash
git add "src/app/(app)/recipes/[id]/page.tsx"
git commit -m "feat(design): restyle recipe detail — hero title, wayfinder numerals, semantic tokens"
```

---

## Task 12: Final Sweep + Verification

- [ ] **Step 1: Search for remaining old color tokens**

```bash
grep -rn "stone-\|emerald-\|amber-\|red-[0-9]" src/app src/components --include="*.tsx"
```

For any hits outside `node_modules`, replace:
- `text-stone-400` / `text-stone-500` → `text-secondary`
- `text-stone-600` / `text-stone-700` → `text-on-surface-variant`
- `text-stone-900` / `text-stone-800` → `text-on-surface`
- `bg-stone-*` → nearest surface token
- `emerald-*` → `primary` equivalent
- `amber-*` → `error-container` equivalent

- [ ] **Step 2: Search for structural borders**

```bash
grep -rn "border-\|divide-" src/app src/components --include="*.tsx"
```

Any `border-` hit that is NOT `border-2 border-secondary` in `shopping-list-view.tsx` (the check indicator circle) should be removed.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Fix all errors.

- [ ] **Step 4: Lint check**

```bash
npm run lint
```

Fix all errors.

- [ ] **Step 5: Run existing tests**

```bash
npm test
```

These are parse/logic tests (no UI tests exist). Expected: all pass.

- [ ] **Step 6: Commit any sweep fixes**

```bash
git add -A
git commit -m "fix(design): sweep remaining old color tokens and structural borders"
```

---

## Task 13: Push + PR

- [ ] **Step 1: Push branch**

```bash
git push -u origin HEAD
```

- [ ] **Step 2: Open PR**

```bash
gh pr create \
  --title "feat: Modern Heirloom redesign — Newsreader/Work Sans, terracotta palette, no-border depth" \
  --body "## Summary
- Replaces stone/emerald Tailwind palette with Modern Heirloom design system (terracotta, cream surfaces, stone secondary tones)
- Loads Newsreader (serif) + Work Sans (sans) via next/font/google; Newsreader used for all headlines and recipe titles
- No-border depth: all UI separation is achieved through tonal background color shifts, not 1px lines
- Full token system in @theme block; all components updated to use semantic utility classes

## Test plan
- [ ] Home page: cream background, Mise wordmark in Newsreader, pill search, cards float on surface-low container
- [ ] Add recipe page: pill tab switcher, borderless inputs with focus outline, gradient CTA button
- [ ] Recipe detail: large serif hero title, wayfinder numerals behind instructions, pill stepper, secondary pill Add to Shopping List
- [ ] Shopping list: terracotta check indicator, ghost Clear checked, error-container Clear all
- [ ] Bottom nav: no top border, terracotta active icon
- [ ] Auth pages: cream background behind Clerk widget
- [ ] TypeScript: npx tsc --noEmit passes
- [ ] Lint: npm run lint passes
- [ ] Tests: npm test passes"
```
