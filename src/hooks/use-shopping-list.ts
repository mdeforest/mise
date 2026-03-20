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
