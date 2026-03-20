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
  title           text
  servings        integer
  source_url      text nullable
  created_at      timestamptz

ingredients
  id              uuid primary key
  recipe_id       uuid references recipes
  name            text
  quantity        decimal nullable
  unit            text nullable
  order           integer

steps
  id              uuid primary key
  recipe_id       uuid references recipes
  order           integer
  text            text
```

---

## Parsing Pipeline

When a user submits a URL or raw text, the server runs this pipeline in order:

1. **URL fetch** (URL input only) — fetch raw HTML from the URL server-side
2. **JSON-LD extraction** — parse `<script type="application/ld+json">` blocks for `Recipe` schema. If found and complete, skip to step 4. This handles most major recipe sites including paywalled ones (e.g. NYT Cooking).
3. **Claude HTML/text parsing** — send the raw HTML or pasted text to Claude with a structured extraction prompt. Returns `{ title, servings, ingredients: [{ name, quantity, unit }], steps: [{ order, text }] }`.
4. **Save to database** — persist the structured recipe.

### Failure Handling

| Failure | User-facing response |
|---------|---------------------|
| Paywalled URL, no JSON-LD, Claude can't extract | "Couldn't read this page — try pasting the recipe text instead." |
| Parse succeeds but ingredients or steps are empty | Warning banner: "Some fields may be missing — you can edit the recipe." (edit flow is v2) |
| Duplicate URL | "You already saved this recipe. View it or save a new copy?" |

---

## Features

### Add Recipe
- Two-tab input screen: **Paste URL** / **Paste Text**
- Single "Import" button with loading state during parse
- On success: navigate to Recipe Detail

### Recipe Library (Home)
- Full-width cards on mobile, grid on tablet+
- Each card shows: title, source domain (if URL), thumbnail (og:image if scraped)
- Search by recipe title

### Recipe Detail
- Title, source link, serving count
- **Scale control** — ½, 1x, 2x, 3x selector; quantities update in place
- Ingredients list with quantities + units
- Step-by-step instructions
- "Add to Shopping List" button (adds all ingredients from current scaled serving)

### Shopping List
- Aggregated ingredients across all added recipes
- Checklist UI with large tap targets
- "Clear checked" and "Clear all" actions
- Accessed via bottom nav

### Auth
- Email/password via Clerk
- Single shared account for v1 (user + boyfriend)
- All recipes scoped to `user_id`

---

## UI / Mobile-First Design

- **Bottom navigation bar**: Home, Add (+), Shopping List
- Recipe import is a focused single-screen flow
- Recipe detail scrolls vertically: title → scale control → ingredients → steps
- Shopping list is full-screen checklist optimized for one-handed use
- Offline support: recipes cached in browser (service worker or localStorage) for reading without a connection

---

## Out of Scope (v1)

- Recipe editing after import
- Sharing recipes with other users
- Meal planning
- Grocery store aisle grouping
- Multiple user accounts / household sharing

---

## Success Criteria

- User can import a recipe from a URL in under 10 seconds
- User can import a recipe from pasted text
- Ingredients and steps are correctly extracted for common recipe sites
- Scaling updates all ingredient quantities correctly
- Shopping list is usable while shopping (offline, large tap targets)
