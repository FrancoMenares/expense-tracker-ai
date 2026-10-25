import type { Encoder } from '../types';

export const encodeJson: Encoder = ({ expenses, summary, options, generatedAt }) => {
  const document = {
    exportedAt: generatedAt.toISOString(),
    filters: {
      startDate: options.startDate || null,
      endDate: options.endDate || null,
      categories: options.categories,
      search: options.search.trim() || null,
    },
    summary: {
      count: summary.count,
      total: summary.total,
      firstDate: summary.firstDate,
      lastDate: summary.lastDate,
      byCategory: summary.byCategory,
    },
    expenses: expenses.map(({ id, date, category, amount, description }) => ({ id, date, category, amount, description })),
  };
  return new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' });
};
