import type { Category } from './types';

interface CategoryMeta {
  icon: string;
  /** Hex color used by charts. */
  color: string;
  /** Tailwind classes for badges. */
  badge: string;
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  Food: { icon: '🍔', color: '#f97316', badge: 'bg-orange-50 text-orange-700 ring-orange-600/20' },
  Transportation: { icon: '🚗', color: '#3b82f6', badge: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
  Entertainment: { icon: '🎬', color: '#a855f7', badge: 'bg-purple-50 text-purple-700 ring-purple-600/20' },
  Shopping: { icon: '🛍️', color: '#ec4899', badge: 'bg-pink-50 text-pink-700 ring-pink-600/20' },
  Bills: { icon: '🧾', color: '#14b8a6', badge: 'bg-teal-50 text-teal-700 ring-teal-600/20' },
  Other: { icon: '📦', color: '#64748b', badge: 'bg-slate-100 text-slate-700 ring-slate-600/20' },
};
