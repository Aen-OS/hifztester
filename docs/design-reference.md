# Itqaan — UI Redesign Handoff

## What this is

A focused UI-only redesign of the Itqaan (إتقان) Quran memorisation app. This is a Next.js 15 + Supabase project. You are redesigning the visual layer only — do NOT modify any logic, API calls, database queries, game mechanics, auth flows, or Supabase interactions.

---

## Step 1 — Update global.css

Replace or extend the existing :root and base styles with these tokens:

```css
/* 1. Import fonts */

@layer base {
  :root {
    --font-arabic: var(--font-scheherazade);
    --font-display: var(--font-dm-serif-display);
    --font-body: var(--font-dm-serif-text);
    --font-rakkas: var(--font-rakkas);

    --color-emerald-50: #eaf5ee;
    --color-emerald-200: #a8d8bb;
    --color-emerald-400: #2db87a;
    --color-emerald-700: #0f5c3a;

    --color-gold-50: #fef5e4;
    --color-gold-300: #e8b84a;
    --color-gold-500: #c8861a;

    --color-ink: #1a2e24;
    --color-muted: #7a9e8a;
    --color-border: #d4e8dc;
    --color-base: #f7f9f8;
    --color-surface: #ffffff;

    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 14px;
    --radius-full: 9999px;
  }

  body {
    font-family: var(--font-body);
    background-color: var(--color-base);
    color: var(--color-ink);
  }

  h1,
  h2,
  h3,
  h4 {
    font-family: var(--font-display);
    font-weight: 400;
    color: var(--color-ink);
  }

  [lang="ar"],
  .arabic {
    font-family: var(--font-arabic);
    direction: rtl;
    line-height: 2.2;
  }
}
```

---

## Step 2 — Update tailwind.config.ts

Extend the theme to wire up CSS variables as Tailwind utilities:

```ts
theme: {
  extend: {
    colors: {
      emerald: {
        50:  'var(--color-emerald-50)',
        200: 'var(--color-emerald-200)',
        400: 'var(--color-emerald-400)',
        700: 'var(--color-emerald-700)',
      },
      gold: {
        50:  'var(--color-gold-50)',
        300: 'var(--color-gold-300)',
        500: 'var(--color-gold-500)',
      },
      ink:     'var(--color-ink)',
      muted:   'var(--color-muted)',
      border:  'var(--color-border)',
      base:    'var(--color-base)',
      surface: 'var(--color-surface)',
    },
    fontFamily: {
      display: ['var(--font-display)'],
      body:    ['var(--font-body)'],
      arabic:  ['var(--font-arabic)'],
    },
    borderRadius: {
      sm:   'var(--radius-sm)',
      md:   'var(--radius-md)',
      lg:   'var(--radius-lg)',
      full: 'var(--radius-full)',
    },
    maxWidth: { app: '480px' },
  },
}
```

---

## Step 3 — Build the anchor component first

Before touching any other component, redesign the game selection card grid on the dashboard. This is the anchor — all other components must match its style.

The game card grid should:

- Sit on a white surface card with border `0.5px solid var(--color-border)` and `border-radius: var(--radius-lg)`
- Display 5 game cards in a 2-column grid (last card full width or centred)
- Each game card: white bg, `border: 0.5px solid var(--color-border)`, `border-radius: var(--radius-md)`, 12px padding
- Game name: `font-family: var(--font-display)`, 17px, color `var(--color-emerald-700)`
- Game subtitle: `font-family: var(--font-body)`, 12px, color `var(--color-muted)`
- AyahFlow, SurahSense, Ma'naMatch → emerald tint on hover (`bg-emerald-50`)
- KalamQuest, TartibLock → gold tint on hover (`bg-gold-50`)
- No box-shadows anywhere — borders only

---

## Step 4 — Redesign remaining components in this order

Work through these one at a time. Confirm each visually before moving to the next.

1. **Navigation / header bar** — white bg, `border-bottom: 0.5px solid var(--color-border)`, logo in DM Serif Display at emerald-700, streak badge (emerald-700 bg, white text, pill shape)
2. **Dashboard / home page** — base (#F7F9F8) page bg, section headings in DM Serif Display, stats row (ayaat count, accuracy %, streak) in white surface cards with emerald-700 numbers
3. **Game screens (all 5)** — consistent layout: DM Serif Display heading, Arabic ayah in Scheherazade New (min 22px, RTL, line-height 2.2), answer options as white cards with border, correct flash = emerald-50 bg + emerald-400 border, wrong flash = gold-50 bg + gold-300 border + shake animation
4. **Progress / results screen** — score in DM Serif Display 3xl, XP gained in gold-500, continue button in emerald-700 bg with white text
5. **Timer bar** — 4px height, full width, emerald-400 fill animating left to right, switches to gold-300 when under 10 seconds

---

## Design rules to follow throughout

- **No box-shadows** — use `0.5px solid var(--color-border)` borders instead
- **No dark backgrounds** — this is a light-mode-first design
- **Arabic text** — always `font-family: var(--font-arabic)`, `direction: rtl`, `line-height: 2.2`, minimum 20px. Never override with a sans-serif
- **Font weights** — DM Serif Display headings at `font-weight: 400` (serifs are visually strong at 400, do not go higher). Body text at 400, never bold
- **Spacing** — base unit 4px. Use 8px, 12px, 16px, 24px, 32px gaps. Page horizontal padding 16px. Max page width 480px
- **Colour usage** — emerald-700 for primary actions and headings, emerald-400 for progress/success, gold-500 for XP and streaks, gold-300 for highlights and warnings, muted (#7A9E8A) for all secondary text
- **Do not** remove, rename, or restructure any component props, server actions, or data fetching logic

---

## Done when

Every screen uses the new tokens consistently, the anchor game card component is the visual reference point for all other cards, and no existing functionality is broken.
