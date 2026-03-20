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
