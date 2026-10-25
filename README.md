# Spendwise — Expense Tracker

A personal expense tracker built with Next.js 14 (App Router), TypeScript and Tailwind CSS. Data is stored in the browser's `localStorage`.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

Other scripts: `npm run lint`, `npm run typecheck`.

## Features

- **Dashboard** (`/`): total, this-month (with % change vs last month), average and top-category cards; 6-month spending chart; category donut + breakdown; 5 most recent expenses.
- **Expenses** (`/expenses`): search, category filter, date range (plus quick presets), sorting, filtered total, edit/delete, CSV export of the current filtered view.
- **Add / edit** from anywhere via the header button. Validation: amount > 0 with up to 2 decimals (max $1,000,000), date required and not in the future, category required, description required (max 100 chars).
- Toast notifications, delete confirmation, loading skeletons, storage error handling, multi-tab sync, mobile bottom navigation.

## Project structure

```
src/
  app/              # routes: dashboard (page.tsx) and expenses/
  components/       # UI: form, list, filters, charts, modal, navbar
  context/          # expenses store, toasts, add/edit/delete dialogs
  lib/              # types, storage, formatting, analytics, CSV, sample data
```
