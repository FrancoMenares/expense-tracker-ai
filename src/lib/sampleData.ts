import { toISODate } from './format';
import { generateId } from './storage';
import type { Category, Expense } from './types';

const TEMPLATES: Record<Category, { descriptions: string[]; min: number; max: number }> = {
  Food: { descriptions: ['Groceries', 'Lunch with team', 'Coffee', 'Dinner out', 'Bakery'], min: 4, max: 120 },
  Transportation: { descriptions: ['Gas', 'Uber ride', 'Metro card', 'Parking', 'Car wash'], min: 3, max: 70 },
  Entertainment: { descriptions: ['Movie tickets', 'Streaming subscription', 'Concert', 'Video game'], min: 10, max: 90 },
  Shopping: { descriptions: ['New shoes', 'Clothing', 'Home supplies', 'Electronics accessory'], min: 15, max: 200 },
  Bills: { descriptions: ['Electricity bill', 'Internet', 'Phone plan', 'Water bill', 'Rent share'], min: 30, max: 400 },
  Other: { descriptions: ['Gift', 'Haircut', 'Donation', 'Pharmacy'], min: 5, max: 80 },
};

const WEIGHTS: [Category, number][] = [
  ['Food', 10],
  ['Transportation', 6],
  ['Entertainment', 3],
  ['Shopping', 3],
  ['Bills', 2],
  ['Other', 2],
];

function pickCategory(): Category {
  const total = WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [category, weight] of WEIGHTS) {
    r -= weight;
    if (r <= 0) return category;
  }
  return 'Other';
}

/** Generates realistic-looking expenses spread over the last ~6 months. */
export function generateSampleExpenses(count = 60): Expense[] {
  const now = new Date();
  const createdAt = now.toISOString();
  return Array.from({ length: count }, () => {
    const category = pickCategory();
    const t = TEMPLATES[category];
    const daysAgo = Math.floor(Math.random() * 180);
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
    const amount = Math.round((t.min + Math.random() * (t.max - t.min)) * 100) / 100;
    return {
      id: generateId(),
      date: toISODate(date),
      amount,
      category,
      description: t.descriptions[Math.floor(Math.random() * t.descriptions.length)],
      createdAt,
      updatedAt: createdAt,
    };
  });
}
