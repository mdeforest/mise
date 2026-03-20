# Recipe Paste — Design Spec

**Date:** 2026-03-19
**Status:** Approved

---

## Overview

A mobile-first web app for clipping and managing recipes. Users paste a URL or raw recipe text; the app extracts structured data (title, ingredients, steps) and saves it to a personal library. From there, users can scale recipes and build shopping lists.

---

## Architecture

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS |
| Database | Neon (serverless Postgres) |
| Auth | Clerk (email/password) |
| AI parsing | Claude API |
| Deployment | Vercel (free tier) |

### Data Model

```sql
recipes
  id              uuid primary key
  user_id         text (from Clerk)
  title           text not null
  servings        numeric nullable        -- numeric to support half-servings
  source_url      text nullable
  thumbnail_url   text nullable           -- stored at import time from og:image
  created_at      timestamptz

  unique (user_id, source_url) where source_url is not null

ingredients
  id              uuid primary key
  recipe_id       uuid references recipes on delete cascade
  name            text not null
  quantity        decimal nullable        -- null for "to taste", "a pinch", etc.
  unit            text nullable
  order           integer not null

steps
  id              uuid primary key
  recipe_id       uuid references recipes on delete cascade
  order           integer not null
  text            text not null
```

---

## Parsing Pipeline

When a user submits a URL or raw text, the server runs this pipeline in order. The `/api/parse` route requires authentication and enforces a per-user rate limit of 20 requests per hour.

**Input limits:** Raw text input is capped at 50,000 characters server-side. Requests exceeding this are rejected before hitting Claude.

1. **URL fetch** (URL input only) — fetch raw HTML server-side
2. **JSON-LD extraction** — parse `<script type="application/ld+json">` blocks for a `Recipe` schema object. Considered **complete** if all three of `name`, `recipeIngredient`, and `recipeInstructions` are present and non-empty. If complete, extract and skip to step 4.
3. **Claude HTML/text parsing** — send the raw HTML or pasted text to Claude with a structured extraction prompt. Expected response: `{ title, servings, ingredients: [{ name, quantity, unit }], steps: [{ order, text }] }`.
4. **Save to database** — persist the structured recipe and thumbnail URL (from `og:image` if available, otherwise null).

### Non-numeric Ingredient Quantities

Ingredients with no parseable quantity (e.g. "a pinch of salt", "to taste", "1 large egg") are stored with `quantity = null` and `unit = null`. In scaled views, these are displayed as-is with a "~" prefix to signal they weren't scaled (e.g. "~ a pinch of salt").

### Failure Handling

| Failure | User-facing response |
|---------|---------------------|
| Paywalled URL, no JSON-LD, Claude can't extract | "Couldn't read this page — try pasting the recipe text instead." |
| Parse succeeds but ingredients or steps are empty | Warning banner on recipe detail: "Some fields may be missing." |
| Duplicate URL | "You already saved this recipe. View it or save a new copy?" Saving a new copy inserts a new row; both rows may share the same `source_url`. |
| Input exceeds 50,000 characters | "That text is too long to process. Try trimming it to just the recipe." |
| Claude API service failure (5xx / timeout) | "Something went wrong on our end — please try again in a moment." Distinct from a parse failure; no fallback, just retry. |
| Claude API returns success but empty fields | Treated as a parse failure: show warning, save partial result. |

---

## Features

### Add Recipe
- Two-tab input screen: **Paste URL** / **Paste Text**
- Single "Import" button with loading state during parse
- On success: navigate to Recipe Detail

### Recipe Library (Home)
- Full-width cards on mobile, grid on tablet+
- Each card shows: title, source domain (if URL), thumbnail (if available) or a placeholder
- Search by recipe title

### Recipe Detail
- Title, source link, serving count
- **Scale control** — ½, 1x, 2x, 3x selector; numeric quantities update in place; non-numeric ingredients display with "~" prefix
- Ingredients list with quantities + units
- Step-by-step instructions
- "Add to Shopping List" button — adds all ingredients at the current scale

### Shopping List
- Lists all ingredients added across recipes — **no aggregation in v1**; each ingredient is its own line item even if the same name appears multiple times
- Checklist UI with large tap targets
- "Clear checked" and "Clear all" actions
- Accessible via bottom nav

### Auth
- Email/password via Clerk
- Single shared account for v1 (user + boyfriend)
- All recipes and shopping list items scoped to `user_id`

---

## UI / Mobile-First Design

- **Bottom navigation bar**: Home, Add (+), Shopping List
- Recipe import is a focused single-screen flow
- Recipe detail scrolls vertically: title → scale control → ingredients → steps
- Shopping list is full-screen checklist optimized for one-handed use

### Offline Support

- All recipes the user has **previously viewed** are cached in the browser via a Service Worker (cache-first for recipe detail pages)
- The shopping list is stored in **localStorage** and is always available offline; mutations while offline are applied immediately to localStorage and synced to the server when connectivity returns (simple online event listener, no complex queue)
- Adding a recipe requires connectivity (parse pipeline calls external services)

---

## Security

- `/api/parse` requires a valid Clerk session
- Per-user rate limit: 20 parse requests per hour (returns 429 with message "Too many imports — try again later")
- Server-side input size limit: 50,000 characters

---

## Out of Scope (v1)

- Recipe editing after import
- Sharing recipes with other users
- Meal planning
- Grocery store aisle grouping
- Multiple user accounts / household sharing
- Shopping list ingredient aggregation (combining duplicate items)

---

## Success Criteria

- User can import a recipe from a URL in under 10 seconds
- User can import a recipe from pasted text
- Ingredients and steps are correctly extracted for common recipe sites
- Scaling updates all numeric ingredient quantities correctly; non-numeric pass through with "~" prefix
- Shopping list is readable and checkable offline
- Duplicate URL is detected and the user is prompted before saving again
