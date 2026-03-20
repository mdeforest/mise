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

---

## 3. Design Tokens

All defined in `globals.css` inside the `@theme` block. Replaces existing `--background`/`--foreground` variables and all `stone-*`/`emerald-*` color usage.

### Colors

| Token | Hex | Semantic Role |
|---|---|---|
| `--color-primary` | `#9d3d2e` | CTAs, active states |
| `--color-primary-container` | `#bd5444` | Gradient end for primary buttons |
| `--color-on-primary` | `#ffffff` | Text on primary backgrounds |
| `--color-surface` | `#fbf9f5` | Page background ("the paper") |
| `--color-surface-low` | `#f5f3ef` | Section containers (Level 1) |
| `--color-surface-lowest` | `#ffffff` | Cards, elevated containers (Level 2) |
| `--color-surface-high` | `#eae8e4` | Inactive steppers, decorative elements |
| `--color-surface-highest` | `#e4e2de` | Input field backgrounds |
| `--color-on-surface` | `#1b1c1a` | Primary body text (charcoal — never pure black) |
| `--color-on-surface-variant` | `#56423e` | Secondary/metadata text |
| `--color-secondary` | `#655d56` | Secondary icons, timestamps |
| `--color-secondary-container` | `#eaddd5` | Secondary button backgrounds |
| `--color-on-secondary-container` | `#69615a` | Text on secondary buttons |
| `--color-tertiary` | `#006858` | Success states, dietary/health tags |
| `--color-on-tertiary` | `#ffffff` | Text on tertiary backgrounds |
| `--color-outline-variant` | `#ddc0bb` | Ghost border (used at 15–20% opacity only) |

### Typography

| Token | Value | Role |
|---|---|---|
| `--font-display` | Newsreader (Google Font, serif) | Headlines, recipe titles, step wayfinders |
| `--font-body` | Work Sans (Google Font, sans-serif) | Body text, ingredients, UI labels |

Both loaded via `next/font/google` in `layout.tsx` and injected as CSS variables.

### Radii

| Token | Value | Usage |
|---|---|---|
| `--radius-card` | `0.5rem` | Cards |
| `--radius-pill` | `9999px` | Buttons, tags, steppers, search input |
| `--radius-input` | `0.75rem` | Text inputs, textareas |

---

## 4. Global Styles

Applied in `globals.css`:

- `body` background: `bg-surface` (`#fbf9f5`)
- `body` color: `text-on-surface` (`#1b1c1a`)
- Default font: Work Sans (`font-body`)
- Dark mode: removed (Stitch design is light-only)
- **No-Line Rule:** no `border` utilities on structural elements anywhere in the app — all separation via background color tonal shifts

---

## 5. Component Specifications

### Buttons

**Primary**
- Shape: pill (`rounded-full`)
- Background: CSS gradient `from-primary to-primary-container` (linear, mimics ceramic light)
- Text: `text-on-primary` (white), Work Sans medium, `text-sm`
- No border

**Secondary**
- Shape: pill
- Background: `bg-secondary-container`
- Text: `text-on-secondary-container`
- No border

**Ghost / Tertiary**
- Text-only in `text-primary`, Work Sans medium
- No background, no border
- Used for: Cancel, Back, low-priority actions

### Inputs & Search

- Background: `bg-surface-highest`
- Border radius: `rounded-xl` (text inputs) or `rounded-full` (search)
- No border in default state
- Focus: background shifts to `bg-surface-lowest` (white) + `outline` of `primary` at 20% opacity
- Placeholder: `text-secondary`

### Cards

- Background: `bg-surface-lowest`
- Placed on `bg-surface-low` section — tonal contrast creates visual edge without borders
- Shadow: `shadow-[0_8px_32px_rgba(27,28,26,0.05)]` (ambient, diffuse)
- Border radius: `rounded-lg` (`0.5rem`)

### Bottom Navigation

- Background: `bg-surface-lowest`
- No top border — tonal contrast with `bg-surface` page provides edge
- Active icon: `text-primary`
- Inactive icon: `text-secondary`

### Tags & Pills

- Dietary/health tags (Vegan, GF, etc.): `bg-tertiary`, `text-on-tertiary`, `rounded-full`
- Category tags: `bg-secondary-container`, `text-on-secondary-container`, `rounded-full`

### Scaling Stepper (recipe detail)

- Container: `bg-surface-low`, `rounded-full`
- Active step: `bg-primary`, `text-on-primary`
- Inactive step: `bg-surface-high`, `text-on-surface-variant`
- Pill-shaped segments, no borders

### Instruction Step Wayfinders

- Large Newsreader numerals (`text-8xl` or larger) in `text-surface-high`
- Positioned absolutely behind instruction text
- Decorative — provides visual "wayfinding" without distracting from content

---

## 6. Screen-by-Screen Layout

### Home (`/`)

- Page: `bg-surface`
- Header: "Mise" in Newsreader `text-4xl`, left-aligned with asymmetric margin (`px-6` title, `px-10` subtitle)
- Search: full-width, `bg-surface-highest`, `rounded-full`, no border
- Recipe list: `bg-surface-low` section container
- Recipe cards: `bg-surface-lowest`, ambient shadow, recipe title in Newsreader, metadata in Work Sans `text-xs text-secondary`

### Add Recipe (`/add`)

- Page: `bg-surface`
- Section blocks: `bg-surface-low` containers, `rounded-xl`, no borders
- URL input, text paste area: `bg-surface-highest`, no border
- Submit: full-width primary pill gradient button
- Error states: background color shifts only — no red borders

### Recipe Detail (`/recipes/[id]`)

- Hero title: Newsreader `text-6xl`, generous top margin, slight left editorial indent
- Metadata row: Work Sans `text-xs text-secondary`, dietary tags as tertiary green pills
- Scaling stepper: pill row in `bg-surface-low` container
- Ingredients: `bg-surface-low` container, `gap-4` spacing between items (no dividers). Alternating rows can use `bg-surface` vs `bg-surface-low` for long lists
- Instructions: each step has absolute-positioned Newsreader numeral wayfinder behind text
- Add to shopping list: secondary pill button

### Shopping List (`/shopping-list`)

- Page: `bg-surface`
- Items container: `bg-surface-low`, no borders
- Checkboxes: `accent-primary`
- Checked items: `text-secondary line-through`
- "Clear checked": ghost/tertiary button

### Auth Wrappers (`/sign-in`, `/sign-up`)

- Page background: `bg-surface` (was `bg-stone-50`)
- Clerk `<SignIn />` / `<SignUp />` widget centered on cream background
- No other structural changes (Clerk widget is hosted UI)

---

## 7. Font Loading

In `src/app/layout.tsx`:

```tsx
import { Newsreader, Work_Sans } from 'next/font/google'

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-display',
  style: ['normal', 'italic'],
})

const workSans = Work_Sans({
  subsets: ['latin'],
  variable: '--font-body',
})
```

Both variables applied to `<html>` element. `font-body` set as default on `body`.

---

## 8. Migration Notes

- Remove all `stone-*` and `emerald-*` Tailwind color references
- Remove Geist font imports and `--font-geist-sans` / `--font-geist-mono` variables
- Remove all `border` and `divide-*` utilities from structural elements
- The `globals.css` `@theme` block replaces the existing minimal theme entirely
- No dark mode — remove `@media (prefers-color-scheme: dark)` block

---

## 9. Out of Scope

- Clerk widget appearance customization (appearance prop)
- Dark mode
- Animation / transition design
- New features or route changes
