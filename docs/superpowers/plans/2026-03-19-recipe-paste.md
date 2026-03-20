# Recipe Paste Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first web app where users paste a URL or recipe text, extract structured ingredients and steps via Gemini 2.0 Flash, and manage a recipe library with scaling and shopping list.

**Architecture:** Next.js 15 App Router with Clerk auth, Neon Postgres via Drizzle ORM, and a three-step parsing pipeline (JSON-LD → Gemini → fail gracefully). Shopping list is localStorage-backed with online sync.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Clerk, Neon, Drizzle ORM, Gemini 2.0 Flash (`@google/generative-ai`), Vitest, Vercel

---

## File Map

```
recipe-paste/
├── middleware.ts                          # Clerk auth — protects all (app) routes
├── drizzle.config.ts                      # Drizzle + Neon connection config
├── vitest.config.ts                       # Vitest setup
├── public/
│   └── sw.js                             # Service worker — cache-first for recipe pages
├── src/
│   ├── types/
│   │   └── recipe.ts                     # Shared TypeScript types
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts                  # Neon + Drizzle client
│   │   │   └── schema.ts                 # Drizzle table definitions
│   │   └── parse/
│   │       ├── jsonld.ts                 # JSON-LD Recipe schema extractor
│   │       ├── gemini.ts                 # Gemini 2.0 Flash parsing wrapper
│   │       └── pipeline.ts              # Orchestrates jsonld → gemini → error
│   ├── hooks/
│   │   └── use-shopping-list.ts         # localStorage shopping list + online sync
│   ├── components/
│   │   ├── bottom-nav.tsx               # Home / Add / Shopping List nav
│   │   ├── recipe-card.tsx              # Library card (title, domain, thumbnail)
│   │   ├── import-form.tsx              # URL/text tab input + Import button
│   │   ├── scale-control.tsx            # ½ / 1x / 2x / 3x selector
│   │   └── shopping-list-view.tsx       # Full-screen checklist UI
│   └── app/
│       ├── layout.tsx                   # Root layout — ClerkProvider
│       ├── globals.css
│       ├── (auth)/
│       │   ├── sign-in/[[...sign-in]]/page.tsx
│       │   └── sign-up/[[...sign-up]]/page.tsx
│       ├── (app)/
│       │   ├── layout.tsx               # App shell — BottomNav
│       │   ├── page.tsx                 # Recipe library (home)
│       │   ├── add/
│       │   │   └── page.tsx             # Add recipe (ImportForm)
│       │   ├── recipes/
│       │   │   └── [id]/
│       │   │       └── page.tsx         # Recipe detail
│       │   └── shopping-list/
│       │       └── page.tsx             # Shopping list
│       └── api/
│           ├── parse/
│           │   └── route.ts             # POST — fetch + parse + save recipe
│           ├── recipes/
│           │   ├── route.ts             # GET all recipes for user
│           │   └── [id]/
│           │       └── route.ts         # GET single / DELETE recipe
│           └── shopping-list/
│               └── route.ts             # GET + POST full list (sync endpoint)
└── tests/
    └── lib/
        └── parse/
            ├── jsonld.test.ts
            ├── gemini.test.ts
            └── pipeline.test.ts
```

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `vitest.config.ts`, `.env.local.example`

- [ ] **Step 1: Scaffold Next.js project**

```bash
cd /Users/mdeforest/Documents/Personal/Projects/recipe-paste
npx create-next-app@latest . --typescript --tailwind --app --src-dir --no-eslint --import-alias "@/*"
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @clerk/nextjs @neondatabase/serverless drizzle-orm @google/generative-ai
npm install -D drizzle-kit vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Create vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

Create `vitest.setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Create .env.local.example**

```
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Neon
DATABASE_URL=postgresql://...

# Gemini
GEMINI_API_KEY=AIza...
```

Copy to `.env.local` and fill in real values.

- [ ] **Step 5: Verify setup compiles**

```bash
npm run build
```
Expected: build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: scaffold Next.js 15 project with deps"
```

---

## Task 2: Shared Types

**Files:**
- Create: `src/types/recipe.ts`

- [ ] **Step 1: Write types**

Create `src/types/recipe.ts`:
```typescript
export interface Ingredient {
  id: string
  recipeId: string
  name: string
  quantity: number | null
  unit: string | null
  order: number
}

export interface Step {
  id: string
  recipeId: string
  order: number
  text: string
}

export interface Recipe {
  id: string
  userId: string
  title: string
  servings: number | null
  sourceUrl: string | null
  thumbnailUrl: string | null
  createdAt: Date
  ingredients: Ingredient[]
  steps: Step[]
}

export interface ParsedRecipe {
  title: string
  servings: number | null
  thumbnailUrl: string | null
  ingredients: Array<{ name: string; quantity: number | null; unit: string | null }>
  steps: Array<{ order: number; text: string }>
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/recipe.ts
git commit -m "feat: add shared recipe types"
```

---

## Task 3: Database Schema + Client

**Files:**
- Create: `src/lib/db/schema.ts`, `src/lib/db/index.ts`, `drizzle.config.ts`

- [ ] **Step 1: Write Drizzle schema**

Create `src/lib/db/schema.ts`:
```typescript
import { pgTable, uuid, text, numeric, integer, timestamp, boolean, uniqueIndex } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const recipes = pgTable('recipes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  servings: numeric('servings'),
  sourceUrl: text('source_url'),
  thumbnailUrl: text('thumbnail_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  // Partial unique index: only enforce uniqueness when source_url is not null
  uniqueUserUrl: uniqueIndex('recipes_user_id_source_url_idx')
    .on(t.userId, t.sourceUrl)
    .where(sql`${t.sourceUrl} is not null`),
}))

export const ingredients = pgTable('ingredients', {
  id: uuid('id').primaryKey().defaultRandom(),
  recipeId: uuid('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  quantity: numeric('quantity'),
  unit: text('unit'),
  order: integer('order').notNull(),
})

export const steps = pgTable('steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  recipeId: uuid('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  order: integer('order').notNull(),
  text: text('text').notNull(),
})

export const rateLimits = pgTable('rate_limits', {
  userId: text('user_id').primaryKey(),
  count: integer('count').notNull().default(0),
  windowStart: timestamp('window_start', { withTimezone: true }).defaultNow().notNull(),
})

export const shoppingListItems = pgTable('shopping_list_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  recipeId: uuid('recipe_id').references(() => recipes.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  quantity: numeric('quantity'),
  unit: text('unit'),
  checked: boolean('checked').notNull().default(false),
  order: integer('order').notNull(),
})
```

- [ ] **Step 2: Create Drizzle config**

Create `drizzle.config.ts`:
```typescript
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config
```

- [ ] **Step 3: Create DB client**

Create `src/lib/db/index.ts`:
```typescript
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })
```

- [ ] **Step 4: Run migration to create tables**

```bash
npx drizzle-kit push
```
Expected: all tables created in Neon database.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/ drizzle.config.ts drizzle/
git commit -m "feat: add database schema and Drizzle client"
```

---

## Task 4: Auth Setup

**Files:**
- Create: `middleware.ts`, `src/app/layout.tsx`, `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`, `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`

- [ ] **Step 1: Create Clerk middleware**

Create `middleware.ts`:
```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)'])

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect()
  }
})

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)'],
}
```

- [ ] **Step 2: Create root layout with ClerkProvider**

Create `src/app/layout.tsx`:
```typescript
import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Recipe Paste',
  description: 'Clip and manage recipes',
}

function ServiceWorkerRegistration() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `if('serviceWorker'in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{})})}`,
      }}
    />
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          {children}
          <ServiceWorkerRegistration />
        </body>
      </html>
    </ClerkProvider>
  )
}
```

- [ ] **Step 3: Create sign-in page**

Create `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`:
```typescript
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50">
      <SignIn />
    </main>
  )
}
```

- [ ] **Step 4: Create sign-up page**

Create `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`:
```typescript
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50">
      <SignUp />
    </main>
  )
}
```

- [ ] **Step 5: Start dev server and verify auth flow**

```bash
npm run dev
```
Navigate to `http://localhost:3000` — should redirect to `/sign-in`. Sign in with Google OAuth. Should redirect to `/` after auth.

- [ ] **Step 6: Commit**

```bash
git add middleware.ts src/app/layout.tsx src/app/(auth)/
git commit -m "feat: add Clerk auth with Google OAuth and sign-in/sign-up pages"
```

---

## Task 5: JSON-LD Extractor

**Files:**
- Create: `src/lib/parse/jsonld.ts`, `tests/lib/parse/jsonld.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/lib/parse/jsonld.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { extractJsonLd } from '@/lib/parse/jsonld'

const COMPLETE_HTML = `
<html><head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": "Pasta Carbonara",
  "recipeYield": "4",
  "recipeIngredient": ["200g spaghetti", "100g pancetta", "2 eggs"],
  "recipeInstructions": [
    { "@type": "HowToStep", "text": "Boil pasta." },
    { "@type": "HowToStep", "text": "Fry pancetta." }
  ],
  "image": "https://example.com/pasta.jpg"
}
</script>
</head></html>
`

const INCOMPLETE_HTML = `
<html><head>
<script type="application/ld+json">
{ "@type": "Recipe", "name": "Pasta", "recipeIngredient": ["200g pasta"] }
</script>
</head></html>
`

const NO_RECIPE_HTML = `<html><body><p>Just text</p></body></html>`

describe('extractJsonLd', () => {
  it('returns parsed recipe when JSON-LD is complete', () => {
    const result = extractJsonLd(COMPLETE_HTML)
    expect(result).not.toBeNull()
    expect(result!.title).toBe('Pasta Carbonara')
    expect(result!.servings).toBe(4)
    expect(result!.ingredients).toHaveLength(3)
    expect(result!.steps).toHaveLength(2)
    expect(result!.thumbnailUrl).toBe('https://example.com/pasta.jpg')
  })

  it('returns null when recipeInstructions is missing', () => {
    expect(extractJsonLd(INCOMPLETE_HTML)).toBeNull()
  })

  it('returns null when no Recipe JSON-LD is present', () => {
    expect(extractJsonLd(NO_RECIPE_HTML)).toBeNull()
  })

  it('parses ingredient strings into name/quantity/unit', () => {
    const result = extractJsonLd(COMPLETE_HTML)
    expect(result!.ingredients[0]).toMatchObject({ name: expect.any(String) })
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run tests/lib/parse/jsonld.test.ts
```
Expected: FAIL — `extractJsonLd` not found.

- [ ] **Step 3: Implement JSON-LD extractor**

Create `src/lib/parse/jsonld.ts`:
```typescript
import type { ParsedRecipe } from '@/types/recipe'

interface SchemaRecipe {
  '@type': string
  name?: string
  recipeYield?: string | number
  recipeIngredient?: string[]
  recipeInstructions?: Array<{ text: string } | string> | string
  image?: string | string[] | { url: string }
}

/**
 * Safely parse a fraction string like "1/2" or "3" into a number.
 * Only accepts digits, forward slash, and decimal point — no code execution.
 */
function parseFraction(raw: string): number | null {
  const trimmed = raw.trim()
  if (/^\d+(\.\d+)?$/.test(trimmed)) return parseFloat(trimmed)
  const parts = trimmed.split('/')
  if (parts.length === 2) {
    const num = parseFloat(parts[0])
    const den = parseFloat(parts[1])
    if (!isNaN(num) && !isNaN(den) && den !== 0) return num / den
  }
  return null
}

function parseIngredient(raw: string): { name: string; quantity: number | null; unit: string | null } {
  // Match patterns like "2 cups flour", "1/2 tsp salt", "200g pasta"
  const match = raw.match(/^([\d./]+)\s*([a-zA-Z]+)?\s+(.+)$/)
  if (!match) return { name: raw, quantity: null, unit: null }
  const quantity = parseFraction(match[1])
  const unit = match[2] ?? null
  const name = match[3]
  return { name, quantity, unit }
}

function extractImage(image: SchemaRecipe['image']): string | null {
  if (!image) return null
  if (typeof image === 'string') return image
  if (Array.isArray(image)) return typeof image[0] === 'string' ? image[0] : (image[0] as { url: string }).url
  return (image as { url: string }).url ?? null
}

function extractSteps(instructions: SchemaRecipe['recipeInstructions']): Array<{ order: number; text: string }> {
  if (!instructions) return []
  if (typeof instructions === 'string') return [{ order: 1, text: instructions }]
  return instructions.map((step, i) => ({
    order: i + 1,
    text: typeof step === 'string' ? step : step.text,
  }))
}

export function extractJsonLd(html: string): ParsedRecipe | null {
  const scriptRegex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]) as SchemaRecipe | SchemaRecipe[]
      const items: SchemaRecipe[] = Array.isArray(data) ? data : [data]
      const recipe = items.find((item) => item['@type'] === 'Recipe')

      if (!recipe) continue
      if (!recipe.name || !recipe.recipeIngredient?.length || !recipe.recipeInstructions) continue

      const steps = extractSteps(recipe.recipeInstructions)
      if (!steps.length) continue

      return {
        title: recipe.name,
        servings: recipe.recipeYield ? parseFloat(String(recipe.recipeYield)) || null : null,
        thumbnailUrl: extractImage(recipe.image),
        ingredients: recipe.recipeIngredient.map(parseIngredient),
        steps,
      }
    } catch {
      continue
    }
  }

  return null
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run tests/lib/parse/jsonld.test.ts
```
Expected: PASS all 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/parse/jsonld.ts tests/lib/parse/jsonld.test.ts
git commit -m "feat: add JSON-LD recipe extractor with tests"
```

---

## Task 6: Gemini Parser

**Files:**
- Create: `src/lib/parse/gemini.ts`, `tests/lib/parse/gemini.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/lib/parse/gemini.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn(),
    }),
  })),
}))

import { parseWithGemini } from '@/lib/parse/gemini'
import { GoogleGenerativeAI } from '@google/generative-ai'

const mockGenerateContent = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  ;(GoogleGenerativeAI as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
    getGenerativeModel: () => ({ generateContent: mockGenerateContent }),
  }))
})

describe('parseWithGemini', () => {
  it('returns a ParsedRecipe on successful parse', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          title: 'Pasta Carbonara',
          servings: 4,
          ingredients: [{ name: 'spaghetti', quantity: 200, unit: 'g' }],
          steps: [{ order: 1, text: 'Boil pasta.' }],
        }),
      },
    })

    const result = await parseWithGemini('some recipe text')
    expect(result).not.toBeNull()
    expect(result!.title).toBe('Pasta Carbonara')
    expect(result!.ingredients).toHaveLength(1)
    expect(result!.steps).toHaveLength(1)
  })

  it('returns null when Gemini returns empty ingredients and steps', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({ title: 'Unknown', servings: null, ingredients: [], steps: [] }),
      },
    })
    const result = await parseWithGemini('gibberish')
    expect(result).toBeNull()
  })

  it('returns null on API failure', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API error'))
    const result = await parseWithGemini('some text')
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run tests/lib/parse/gemini.test.ts
```
Expected: FAIL — `parseWithGemini` not found.

- [ ] **Step 3: Implement Gemini parser**

Create `src/lib/parse/gemini.ts`:
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ParsedRecipe } from '@/types/recipe'

const PROMPT = `Extract the recipe from the following text or HTML. Return ONLY valid JSON in this exact shape:
{
  "title": "string",
  "servings": number | null,
  "ingredients": [{ "name": "string", "quantity": number | null, "unit": string | null }],
  "steps": [{ "order": number, "text": "string" }]
}
Quantities should be numbers (e.g. 2, 0.5). If quantity is not a number (e.g. "a pinch", "to taste"), set quantity and unit to null and include the full phrase in "name".
Return ONLY the JSON object, no markdown, no explanation.

TEXT:
`

export async function parseWithGemini(content: string): Promise<ParsedRecipe | null> {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const result = await model.generateContent(PROMPT + content)
    const text = result.response.text().trim()

    // Strip markdown code fences if present
    const json = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
    const parsed = JSON.parse(json) as {
      title: string
      servings: number | null
      ingredients: Array<{ name: string; quantity: number | null; unit: string | null }>
      steps: Array<{ order: number; text: string }>
    }

    if (!parsed.ingredients?.length && !parsed.steps?.length) return null

    return {
      title: parsed.title,
      servings: parsed.servings,
      thumbnailUrl: null,
      ingredients: parsed.ingredients ?? [],
      steps: parsed.steps ?? [],
    }
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run tests/lib/parse/gemini.test.ts
```
Expected: PASS all 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/parse/gemini.ts tests/lib/parse/gemini.test.ts
git commit -m "feat: add Gemini 2.0 Flash recipe parser with tests"
```

---

## Task 7: Parse Pipeline

**Files:**
- Create: `src/lib/parse/pipeline.ts`, `tests/lib/parse/pipeline.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/lib/parse/pipeline.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/parse/jsonld', () => ({ extractJsonLd: vi.fn() }))
vi.mock('@/lib/parse/gemini', () => ({ parseWithGemini: vi.fn() }))

import { runPipeline } from '@/lib/parse/pipeline'
import { extractJsonLd } from '@/lib/parse/jsonld'
import { parseWithGemini } from '@/lib/parse/gemini'

const mockExtract = extractJsonLd as ReturnType<typeof vi.fn>
const mockGemini = parseWithGemini as ReturnType<typeof vi.fn>

const MOCK_RECIPE = {
  title: 'Test Recipe',
  servings: 2,
  thumbnailUrl: null,
  ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
  steps: [{ order: 1, text: 'Mix.' }],
}

beforeEach(() => vi.clearAllMocks())

describe('runPipeline', () => {
  it('returns JSON-LD result and skips Gemini when JSON-LD succeeds', async () => {
    mockExtract.mockReturnValue(MOCK_RECIPE)
    const result = await runPipeline({ type: 'text', content: '<html>...</html>' })
    expect(result.recipe).toEqual(MOCK_RECIPE)
    expect(mockGemini).not.toHaveBeenCalled()
  })

  it('falls back to Gemini when JSON-LD returns null', async () => {
    mockExtract.mockReturnValue(null)
    mockGemini.mockResolvedValue(MOCK_RECIPE)
    const result = await runPipeline({ type: 'text', content: 'some text' })
    expect(result.recipe).toEqual(MOCK_RECIPE)
    expect(mockGemini).toHaveBeenCalled()
  })

  it('returns error when both JSON-LD and Gemini fail', async () => {
    mockExtract.mockReturnValue(null)
    mockGemini.mockResolvedValue(null)
    const result = await runPipeline({ type: 'text', content: 'garbage' })
    expect(result.recipe).toBeNull()
    expect(result.error).toBe('parse_failed')
  })

  it('rejects input exceeding 50000 characters', async () => {
    const result = await runPipeline({ type: 'text', content: 'x'.repeat(50001) })
    expect(result.error).toBe('input_too_long')
    expect(mockGemini).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run tests/lib/parse/pipeline.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement pipeline**

Create `src/lib/parse/pipeline.ts`:
```typescript
import { extractJsonLd } from './jsonld'
import { parseWithGemini } from './gemini'
import type { ParsedRecipe } from '@/types/recipe'

export type PipelineInput =
  | { type: 'url'; url: string }
  | { type: 'text'; content: string }

export type PipelineResult =
  | { recipe: ParsedRecipe; error: null }
  | { recipe: null; error: 'input_too_long' | 'fetch_failed' | 'parse_failed' | 'service_error' }

const MAX_INPUT_LENGTH = 50_000

export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  let html: string

  if (input.type === 'url') {
    try {
      const res = await fetch(input.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RecipePaste/1.0)' },
        signal: AbortSignal.timeout(10_000),
      })
      html = await res.text()
    } catch {
      return { recipe: null, error: 'fetch_failed' }
    }
  } else {
    html = input.content
  }

  if (html.length > MAX_INPUT_LENGTH) {
    return { recipe: null, error: 'input_too_long' }
  }

  // Step 1: JSON-LD
  const jsonLdResult = extractJsonLd(html)
  if (jsonLdResult) return { recipe: jsonLdResult, error: null }

  // Step 2: Gemini
  try {
    const geminiResult = await parseWithGemini(html)
    if (geminiResult) return { recipe: geminiResult, error: null }
    return { recipe: null, error: 'parse_failed' }
  } catch {
    return { recipe: null, error: 'service_error' }
  }
}
```

- [ ] **Step 4: Run all tests — verify they pass**

```bash
npx vitest run
```
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/parse/pipeline.ts tests/lib/parse/pipeline.test.ts
git commit -m "feat: add parse pipeline with JSON-LD → Gemini fallback"
```

---

## Task 8: Parse API Route

**Files:**
- Create: `src/app/api/parse/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/parse/route.ts`:
```typescript
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recipes, ingredients, steps, rateLimits } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { runPipeline } from '@/lib/parse/pipeline'

const RATE_LIMIT = 20
const WINDOW_MS = 60 * 60 * 1000

async function checkRateLimit(userId: string): Promise<boolean> {
  const now = new Date()
  const existing = await db.select().from(rateLimits).where(eq(rateLimits.userId, userId)).limit(1)

  if (!existing.length) {
    await db.insert(rateLimits).values({ userId, count: 1, windowStart: now })
    return true
  }

  const record = existing[0]
  const windowExpired = now.getTime() - record.windowStart.getTime() > WINDOW_MS

  if (windowExpired) {
    await db.update(rateLimits).set({ count: 1, windowStart: now }).where(eq(rateLimits.userId, userId))
    return true
  }

  if (record.count >= RATE_LIMIT) return false

  await db.update(rateLimits).set({ count: record.count + 1 }).where(eq(rateLimits.userId, userId))
  return true
}

async function extractOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5_000) })
    const html = await res.text()
    const match = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)
      ?? html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowed = await checkRateLimit(userId)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many imports — try again later' }, { status: 429 })
  }

  const forceDuplicate = req.nextUrl.searchParams.get('forceDuplicate') === '1'
  const body = await req.json() as { type: 'url' | 'text'; value: string }

  // Check for duplicate URL before parsing (skip if user explicitly chose to save a copy)
  if (body.type === 'url' && !forceDuplicate) {
    const existing = await db.select({ id: recipes.id })
      .from(recipes)
      .where(and(eq(recipes.userId, userId), eq(recipes.sourceUrl, body.value)))
      .limit(1)

    if (existing.length) {
      return NextResponse.json({ duplicate: true, existingId: existing[0].id }, { status: 409 })
    }
  }

  const input = body.type === 'url'
    ? { type: 'url' as const, url: body.value }
    : { type: 'text' as const, content: body.value }

  const result = await runPipeline(input)

  if (!result.recipe) {
    const messages: Record<string, string> = {
      input_too_long: 'That text is too long to process. Try trimming it to just the recipe.',
      fetch_failed: "Couldn't read this page — try pasting the recipe text instead.",
      parse_failed: "Couldn't read this page — try pasting the recipe text instead.",
      service_error: 'Something went wrong on our end — please try again in a moment.',
    }
    return NextResponse.json(
      { error: messages[result.error] ?? 'Unknown error' },
      { status: result.error === 'service_error' ? 502 : 422 }
    )
  }

  const parsed = result.recipe
  const thumbnailUrl = parsed.thumbnailUrl
    ?? (body.type === 'url' ? await extractOgImage(body.value) : null)

  const [recipe] = await db.insert(recipes).values({
    userId,
    title: parsed.title,
    servings: parsed.servings?.toString() ?? null,
    sourceUrl: body.type === 'url' ? body.value : null,
    thumbnailUrl,
  }).returning()

  if (parsed.ingredients.length) {
    await db.insert(ingredients).values(
      parsed.ingredients.map((ing, i) => ({
        recipeId: recipe.id,
        name: ing.name,
        quantity: ing.quantity?.toString() ?? null,
        unit: ing.unit,
        order: i,
      }))
    )
  }

  if (parsed.steps.length) {
    await db.insert(steps).values(
      parsed.steps.map((step) => ({
        recipeId: recipe.id,
        order: step.order,
        text: step.text,
      }))
    )
  }

  return NextResponse.json({ id: recipe.id }, { status: 201 })
}
```

- [ ] **Step 2: Test with curl in dev**

```bash
npm run dev
# In another terminal:
curl -X POST http://localhost:3000/api/parse \
  -H "Content-Type: application/json" \
  -d '{"type":"url","value":"https://www.allrecipes.com/recipe/20144/banana-banana-bread/"}'
```
Expected: `{"id":"..."}` with status 201. (Auth required — test via browser session instead if curl returns 401.)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/parse/
git commit -m "feat: add POST /api/parse with rate limiting and duplicate detection"
```

---

## Task 9: Recipe API Routes

**Files:**
- Create: `src/app/api/recipes/route.ts`, `src/app/api/recipes/[id]/route.ts`

- [ ] **Step 1: Create GET /api/recipes**

Create `src/app/api/recipes/route.ts`:
```typescript
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recipes } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await db.select({
    id: recipes.id,
    title: recipes.title,
    sourceUrl: recipes.sourceUrl,
    thumbnailUrl: recipes.thumbnailUrl,
    createdAt: recipes.createdAt,
  })
    .from(recipes)
    .where(eq(recipes.userId, userId))
    .orderBy(desc(recipes.createdAt))

  return NextResponse.json(result)
}
```

- [ ] **Step 2: Create GET + DELETE /api/recipes/[id]**

Create `src/app/api/recipes/[id]/route.ts`:
```typescript
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recipes, ingredients, steps } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [recipe] = await db.select()
    .from(recipes)
    .where(and(eq(recipes.id, params.id), eq(recipes.userId, userId)))
    .limit(1)

  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const ings = await db.select().from(ingredients)
    .where(eq(ingredients.recipeId, params.id))
    .orderBy(asc(ingredients.order))

  const stps = await db.select().from(steps)
    .where(eq(steps.recipeId, params.id))
    .orderBy(asc(steps.order))

  return NextResponse.json({ ...recipe, ingredients: ings, steps: stps })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.delete(recipes)
    .where(and(eq(recipes.id, params.id), eq(recipes.userId, userId)))

  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/recipes/
git commit -m "feat: add recipe list and detail/delete API routes"
```

---

## Task 10: Shopping List Sync API

**Files:**
- Create: `src/app/api/shopping-list/route.ts`

- [ ] **Step 1: Create route**

Create `src/app/api/shopping-list/route.ts`:
```typescript
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { shoppingListItems } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const items = await db.select()
    .from(shoppingListItems)
    .where(eq(shoppingListItems.userId, userId))
    .orderBy(asc(shoppingListItems.order))

  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as Array<{
    id: string
    recipeId: string | null
    name: string
    quantity: number | null
    unit: string | null
    checked: boolean
    order: number
  }>

  // Full list replacement
  await db.delete(shoppingListItems).where(eq(shoppingListItems.userId, userId))

  if (body.length) {
    await db.insert(shoppingListItems).values(
      body.map((item) => ({
        id: item.id,
        userId,
        recipeId: item.recipeId,
        name: item.name,
        quantity: item.quantity?.toString() ?? null,
        unit: item.unit,
        checked: item.checked,
        order: item.order,
      }))
    )
  }

  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/shopping-list/
git commit -m "feat: add shopping list sync API"
```

---

## Task 11: App Shell — Layout + Bottom Nav

**Files:**
- Create: `src/components/bottom-nav.tsx`, `src/app/(app)/layout.tsx`

- [ ] **Step 1: Install heroicons**

```bash
npm install @heroicons/react
```

- [ ] **Step 2: Create BottomNav component**

Create `src/components/bottom-nav.tsx`:
```typescript
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, PlusCircleIcon, ShoppingCartIcon } from '@heroicons/react/24/outline'
import { HomeIcon as HomeIconSolid, PlusCircleIcon as PlusCircleIconSolid, ShoppingCartIcon as ShoppingCartIconSolid } from '@heroicons/react/24/solid'

const NAV_ITEMS = [
  { href: '/', label: 'Home', Icon: HomeIcon, ActiveIcon: HomeIconSolid },
  { href: '/add', label: 'Add', Icon: PlusCircleIcon, ActiveIcon: PlusCircleIconSolid },
  { href: '/shopping-list', label: 'List', Icon: ShoppingCartIcon, ActiveIcon: ShoppingCartIconSolid },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-200 bg-white">
      <ul className="flex h-16 items-stretch">
        {NAV_ITEMS.map(({ href, label, Icon, ActiveIcon }) => {
          const active = pathname === href
          const Ico = active ? ActiveIcon : Icon
          return (
            <li key={href} className="flex flex-1">
              <Link
                href={href}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors
                  ${active ? 'text-emerald-600' : 'text-stone-500'}`}
              >
                <Ico className="h-6 w-6" />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
```

- [ ] **Step 3: Create app layout**

Create `src/app/(app)/layout.tsx`:
```typescript
import { BottomNav } from '@/components/bottom-nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      {children}
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 4: Verify bottom nav in browser**

```bash
npm run dev
```
Navigate to `http://localhost:3000`. Bottom nav should appear with Home, Add, List tabs. Active tab highlights in emerald.

- [ ] **Step 5: Commit**

```bash
git add src/components/bottom-nav.tsx src/app/(app)/layout.tsx
git commit -m "feat: add app shell with bottom navigation"
```

---

## Task 12: Recipe Library Page

**Files:**
- Create: `src/components/recipe-card.tsx`, `src/app/(app)/page.tsx`

- [ ] **Step 1: Create RecipeCard component**

Create `src/components/recipe-card.tsx`:
```typescript
import Link from 'next/link'
import Image from 'next/image'

interface RecipeCardProps {
  id: string
  title: string
  sourceUrl: string | null
  thumbnailUrl: string | null
}

function getDomain(url: string | null): string | null {
  if (!url) return null
  try { return new URL(url).hostname.replace('www.', '') } catch { return null }
}

export function RecipeCard({ id, title, sourceUrl, thumbnailUrl }: RecipeCardProps) {
  return (
    <Link href={`/recipes/${id}`} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm active:opacity-70">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-stone-100">
        {thumbnailUrl ? (
          <Image src={thumbnailUrl} alt={title} fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl">🍽️</div>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold text-stone-900">{title}</p>
        {getDomain(sourceUrl) && (
          <p className="text-xs text-stone-500">{getDomain(sourceUrl)}</p>
        )}
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Create recipe library page**

Create `src/app/(app)/page.tsx`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import { RecipeCard } from '@/components/recipe-card'

interface RecipeSummary {
  id: string
  title: string
  sourceUrl: string | null
  thumbnailUrl: string | null
}

export default function HomePage() {
  const [recipes, setRecipes] = useState<RecipeSummary[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/recipes')
      .then((r) => r.json())
      .then((data: RecipeSummary[]) => { setRecipes(data); setLoading(false) })
  }, [])

  const filtered = recipes.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <main className="mx-auto max-w-lg px-4 pt-6">
      <h1 className="mb-4 text-2xl font-bold text-stone-900">My Recipes</h1>
      <input
        type="search"
        placeholder="Search recipes..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none focus:border-emerald-500"
      />
      {loading ? (
        <p className="text-center text-stone-400">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-stone-400">
          {recipes.length === 0 ? 'No recipes yet — add one!' : 'No results.'}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((r) => <RecipeCard key={r.id} {...r} />)}
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/recipe-card.tsx src/app/(app)/page.tsx
git commit -m "feat: add recipe library home page with search"
```

---

## Task 13: Add Recipe Page

**Files:**
- Create: `src/components/import-form.tsx`, `src/app/(app)/add/page.tsx`

- [ ] **Step 1: Create ImportForm component**

Create `src/components/import-form.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Tab = 'url' | 'text'

export function ImportForm() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('url')
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleImport() {
    if (!value.trim()) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: tab, value: value.trim() }),
    })

    if (res.status === 409) {
      const data = await res.json() as { duplicate: boolean; existingId: string }
      const choice = window.confirm(
        'You already saved this recipe.\n\nOK = View existing recipe\nCancel = Save a new copy'
      )
      if (choice) {
        router.push(`/recipes/${data.existingId}`)
      } else {
        // Save a new copy by appending ?forceDuplicate=1 — the server allows it when present
        const copyRes = await fetch('/api/parse?forceDuplicate=1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: tab, value: value.trim() }),
        })
        if (copyRes.ok) {
          const copyData = await copyRes.json() as { id: string }
          router.push(`/recipes/${copyData.id}`)
        }
      }
      setLoading(false)
      return
    }

    if (!res.ok) {
      const data = await res.json() as { error: string }
      setError(data.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }

    const data = await res.json() as { id: string }
    router.push(`/recipes/${data.id}`)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex rounded-xl bg-stone-100 p-1">
        {(['url', 'text'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setValue('') }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors
              ${tab === t ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
          >
            {t === 'url' ? 'Paste URL' : 'Paste Text'}
          </button>
        ))}
      </div>

      {tab === 'url' ? (
        <input
          type="url"
          placeholder="https://..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none focus:border-emerald-500"
        />
      ) : (
        <textarea
          placeholder="Paste the recipe text here..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={10}
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none focus:border-emerald-500"
        />
      )}

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <button
        onClick={handleImport}
        disabled={loading || !value.trim()}
        className="w-full rounded-xl bg-emerald-500 py-4 text-base font-semibold text-white transition-opacity disabled:opacity-50 active:opacity-80"
      >
        {loading ? 'Importing...' : 'Import Recipe'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create add page**

Create `src/app/(app)/add/page.tsx`:
```typescript
import { ImportForm } from '@/components/import-form'

export default function AddPage() {
  return (
    <main className="mx-auto max-w-lg px-4 pt-6">
      <h1 className="mb-6 text-2xl font-bold text-stone-900">Add Recipe</h1>
      <ImportForm />
    </main>
  )
}
```

- [ ] **Step 3: Test end-to-end in browser**

1. Sign in, tap "Add" in the nav
2. Paste a recipe URL (e.g. `https://www.allrecipes.com/recipe/20144/banana-banana-bread/`)
3. Tap "Import Recipe" — should navigate to recipe detail
4. Paste same URL again — should show duplicate prompt

- [ ] **Step 4: Commit**

```bash
git add src/components/import-form.tsx src/app/(app)/add/page.tsx
git commit -m "feat: add recipe import page with URL and text input"
```

---

## Task 14: Recipe Detail Page

**Files:**
- Create: `src/components/scale-control.tsx`, `src/app/(app)/recipes/[id]/page.tsx`

- [ ] **Step 1: Create ScaleControl component**

Create `src/components/scale-control.tsx`:
```typescript
'use client'

const SCALES = [0.5, 1, 2, 3] as const
export type Scale = typeof SCALES[number]

interface ScaleControlProps {
  value: Scale
  onChange: (scale: Scale) => void
}

const LABELS: Record<Scale, string> = { 0.5: '½x', 1: '1x', 2: '2x', 3: '3x' }

export function ScaleControl({ value, onChange }: ScaleControlProps) {
  return (
    <div className="flex gap-2">
      {SCALES.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors
            ${s === value ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-600'}`}
        >
          {LABELS[s]}
        </button>
      ))}
    </div>
  )
}

/** Format a scaled quantity as a human-readable string. Returns '' for null quantities. */
export function scaleQuantity(quantity: number | null, scale: number): string {
  if (quantity === null) return ''
  const scaled = quantity * scale
  if (scaled === 0.5) return '½'
  if (scaled === 1.5) return '1½'
  if (scaled === 0.25) return '¼'
  if (Number.isInteger(scaled)) return String(scaled)
  return scaled.toFixed(1).replace(/\.0$/, '')
}
```

- [ ] **Step 2: Create recipe detail page**

Create `src/app/(app)/recipes/[id]/page.tsx`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ScaleControl, scaleQuantity } from '@/components/scale-control'
import { useShoppingList } from '@/hooks/use-shopping-list'
import type { Recipe } from '@/types/recipe'
import type { Scale } from '@/components/scale-control'

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [scale, setScale] = useState<Scale>(1)
  const [loading, setLoading] = useState(true)
  const { addIngredients } = useShoppingList()

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: Recipe | null) => { setRecipe(data); setLoading(false) })
  }, [id])

  if (loading) return <main className="flex min-h-screen items-center justify-center"><p className="text-stone-400">Loading...</p></main>
  if (!recipe) return <main className="flex min-h-screen items-center justify-center"><p className="text-stone-400">Recipe not found.</p></main>

  const hasEmptyFields = !recipe.ingredients.length || !recipe.steps.length

  return (
    <main className="mx-auto max-w-lg px-4 pt-6 pb-8">
      <button onClick={() => router.back()} className="mb-4 text-sm text-stone-500">← Back</button>

      <h1 className="mb-1 text-2xl font-bold text-stone-900">{recipe.title}</h1>
      {recipe.sourceUrl && (
        <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer"
          className="mb-4 block text-sm text-emerald-600 underline">
          View original
        </a>
      )}

      {hasEmptyFields && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Some fields may be missing from this recipe.
        </div>
      )}

      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold text-stone-700">Servings</h2>
          {recipe.servings && (
            <span className="text-sm text-stone-500">
              {scaleQuantity(Number(recipe.servings), scale)} servings
            </span>
          )}
        </div>
        <ScaleControl value={scale} onChange={setScale} />
      </section>

      {recipe.ingredients.length > 0 && (
        <section className="mb-4">
          <h2 className="mb-3 font-semibold text-stone-700">Ingredients</h2>
          <ul className="flex flex-col gap-2">
            {recipe.ingredients.map((ing) => (
              <li key={ing.id} className="text-stone-800">
                {ing.quantity === null ? (
                  <span className="text-stone-400">~ </span>
                ) : (
                  <span className="font-medium">{scaleQuantity(Number(ing.quantity), scale)}{ing.unit ? ` ${ing.unit}` : ''} </span>
                )}
                {ing.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      <button
        onClick={() => addIngredients(recipe.ingredients.map((ing) => ({
          id: crypto.randomUUID(),
          recipeId: recipe.id,
          name: ing.name,
          quantity: ing.quantity !== null ? Number(ing.quantity) * scale : null,
          unit: ing.unit,
          checked: false,
          order: ing.order,
        })))}
        className="mb-6 w-full rounded-xl bg-stone-100 py-3 font-medium text-stone-700 active:opacity-70"
      >
        Add to Shopping List
      </button>

      {recipe.steps.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold text-stone-700">Instructions</h2>
          <ol className="flex flex-col gap-4">
            {recipe.steps.map((step) => (
              <li key={step.id} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                  {step.order}
                </span>
                <p className="text-stone-800 leading-relaxed">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/scale-control.tsx src/app/(app)/recipes/[id]/page.tsx
git commit -m "feat: add recipe detail page with scale control"
```

---

## Task 15: Shopping List Hook + Page

**Files:**
- Create: `src/hooks/use-shopping-list.ts`, `src/components/shopping-list-view.tsx`, `src/app/(app)/shopping-list/page.tsx`

- [ ] **Step 1: Create useShoppingList hook**

Create `src/hooks/use-shopping-list.ts`:
```typescript
'use client'
import { useState, useEffect, useCallback } from 'react'

export interface ShoppingListItem {
  id: string
  recipeId: string | null
  name: string
  quantity: number | null
  unit: string | null
  checked: boolean
  order: number
}

const STORAGE_KEY = 'recipe-paste-shopping-list'

function loadFromStorage(): ShoppingListItem[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as ShoppingListItem[]
  } catch {
    return []
  }
}

function saveToStorage(items: ShoppingListItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

async function syncToServer(items: ShoppingListItem[]) {
  try {
    await fetch('/api/shopping-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items),
    })
  } catch {
    // Offline — will sync on next reconnect
  }
}

export function useShoppingList() {
  const [items, setItems] = useState<ShoppingListItem[]>([])

  useEffect(() => {
    setItems(loadFromStorage())
  }, [])

  useEffect(() => {
    function onOnline() { syncToServer(loadFromStorage()) }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])

  const update = useCallback((next: ShoppingListItem[]) => {
    setItems(next)
    saveToStorage(next)
    if (typeof navigator !== 'undefined' && navigator.onLine) syncToServer(next)
  }, [])

  const addIngredients = useCallback((newItems: ShoppingListItem[]) => {
    const current = loadFromStorage()
    const maxOrder = current.reduce((m, i) => Math.max(m, i.order), -1)
    const withOrder = newItems.map((item, idx) => ({ ...item, order: maxOrder + 1 + idx }))
    update([...current, ...withOrder])
  }, [update])

  const toggle = useCallback((id: string) => {
    update(loadFromStorage().map((item) => item.id === id ? { ...item, checked: !item.checked } : item))
  }, [update])

  const clearChecked = useCallback(() => {
    update(loadFromStorage().filter((item) => !item.checked))
  }, [update])

  const clearAll = useCallback(() => update([]), [update])

  return { items, addIngredients, toggle, clearChecked, clearAll }
}
```

- [ ] **Step 2: Create ShoppingListView component**

Create `src/components/shopping-list-view.tsx`:
```typescript
'use client'
import { useShoppingList } from '@/hooks/use-shopping-list'
import { scaleQuantity } from '@/components/scale-control'

export function ShoppingListView() {
  const { items, toggle, clearChecked, clearAll } = useShoppingList()

  const unchecked = items.filter((i) => !i.checked)
  const checked = items.filter((i) => i.checked)

  if (items.length === 0) {
    return <p className="pt-12 text-center text-stone-400">Your shopping list is empty.</p>
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {checked.length > 0 && (
          <button onClick={clearChecked}
            className="rounded-lg bg-stone-100 px-4 py-2 text-sm font-medium text-stone-600 active:opacity-70">
            Clear checked ({checked.length})
          </button>
        )}
        <button onClick={clearAll}
          className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 active:opacity-70">
          Clear all
        </button>
      </div>

      <ul className="flex flex-col gap-1">
        {unchecked.map((item) => (
          <li key={item.id}>
            <button onClick={() => toggle(item.id)}
              className="flex w-full items-center gap-3 rounded-xl bg-white p-4 text-left active:opacity-70">
              <div className="h-6 w-6 shrink-0 rounded-full border-2 border-stone-300" />
              <span className="text-stone-900">
                {item.quantity !== null && (
                  <span className="font-medium">{scaleQuantity(item.quantity, 1)}{item.unit ? ` ${item.unit}` : ''} </span>
                )}
                {item.quantity === null && <span className="text-stone-400">~ </span>}
                {item.name}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {checked.length > 0 && (
        <>
          <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-stone-400">Checked</p>
          <ul className="flex flex-col gap-1">
            {checked.map((item) => (
              <li key={item.id}>
                <button onClick={() => toggle(item.id)}
                  className="flex w-full items-center gap-3 rounded-xl bg-stone-50 p-4 text-left active:opacity-70">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500">
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="line-through text-stone-400">{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create shopping list page**

Create `src/app/(app)/shopping-list/page.tsx`:
```typescript
import { ShoppingListView } from '@/components/shopping-list-view'

export default function ShoppingListPage() {
  return (
    <main className="mx-auto max-w-lg px-4 pt-6">
      <h1 className="mb-4 text-2xl font-bold text-stone-900">Shopping List</h1>
      <ShoppingListView />
    </main>
  )
}
```

- [ ] **Step 4: Test shopping list end-to-end**

1. View a recipe detail page, tap "Add to Shopping List"
2. Navigate to Shopping List tab — ingredients should appear
3. Tap an item to check it off
4. Tap "Clear checked" — checked items removed
5. Enable airplane mode in DevTools, tap more items — should still work (localStorage)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-shopping-list.ts src/components/shopping-list-view.tsx src/app/(app)/shopping-list/page.tsx
git commit -m "feat: add shopping list with localStorage and online sync"
```

---

## Task 16: Service Worker (Offline Recipe Caching)

**Files:**
- Create: `public/sw.js`

The root layout already registers the SW (added in Task 4).

- [ ] **Step 1: Create service worker**

Create `public/sw.js`:
```javascript
const CACHE_NAME = 'recipe-paste-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  const isRecipePage = url.pathname.startsWith('/recipes/')
  const isRecipeApi = url.pathname.startsWith('/api/recipes/')

  if ((isRecipePage || isRecipeApi) && event.request.method === 'GET') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request)
        if (cached) return cached
        const response = await fetch(event.request)
        if (response.ok) cache.put(event.request, response.clone())
        return response
      })
    )
  }
})
```

- [ ] **Step 2: Test offline behavior**

1. Visit a recipe detail page while online
2. Open DevTools → Application → Service Workers — confirm SW is registered
3. DevTools → Network → set throttle to "Offline"
4. Navigate away and back to the same recipe — should load from cache

- [ ] **Step 3: Commit**

```bash
git add public/sw.js
git commit -m "feat: add service worker for offline recipe page caching"
```

---

## Task 17: Final Polish + Deploy

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```
Expected: All tests pass.

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Run production build**

```bash
npm run build
```
Expected: Build succeeds with no errors.

- [ ] **Step 4: Deploy to Vercel**

```bash
npx vercel
```

When prompted, set these environment variables in the Vercel dashboard (or via CLI):
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `DATABASE_URL`
- `GEMINI_API_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/`

Also update Clerk dashboard: add your production Vercel URL to allowed origins and redirect URLs.

- [ ] **Step 5: Verify production**

1. Sign in with Google OAuth on the production URL
2. Import a recipe from a URL
3. Verify recipe appears in library
4. Add ingredients to shopping list, check items off
5. Enable airplane mode, reload a recipe page — loads from cache

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: finalize for production deployment"
```
