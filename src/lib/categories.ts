import type { Category } from './types';

interface CategoryMeta {
  icon: string;
  /** Hex color used by charts. */
  color: string;
  /** Tailwind classes for badges. */
  badge: string;
}

/**
 * Chart colors in category order. The order matters: adjacent categories sit next to each other in
 * stacked charts, and this sequence keeps every neighbouring pair distinguishable with color vision
 * deficiency. Several hues are under 3:1 on white, so charts always pair them with text labels.
 */
export const CATEGORY_META: Record<Category, CategoryMeta> = {
  Food: { icon: '🍔', color: '#eb6834', badge: 'bg-orange-50 text-orange-700 ring-orange-600/20' },
  Transportation: { icon: '🚗', color: '#2a78d6', badge: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
  Entertainment: { icon: '🎬', color: '#e87ba4', badge: 'bg-pink-50 text-pink-700 ring-pink-600/20' },
  Shopping: { icon: '🛍️', color: '#eda100', badge: 'bg-amber-50 text-amber-800 ring-amber-600/20' },
  Bills: { icon: '🧾', color: '#1baf7a', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  Other: { icon: '📦', color: '#6250d6', badge: 'bg-violet-50 text-violet-700 ring-violet-600/20' },
};
