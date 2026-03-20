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
