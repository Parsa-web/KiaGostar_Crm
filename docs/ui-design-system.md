# Kia Gostar UI design system

## Styling approach

The application uses one global, layered CSS system. `src/styles/index.css` is imported once by the bootstrap. Component markup uses semantic class names; CSS-in-JS, Tailwind, and competing styling systems are not introduced.

Layers load in this order: reset, tokens, typography, layout, utilities, animation, scrollbar, responsive and RTL foundations, shell/auth surfaces, then global component foundations.

## Tokens and theme

`variables.css` owns semantic color, typography, spacing, radius, shadow, border, z-index, transition, layout, and workflow-status tokens. Components reference semantic variables rather than raw colors. The complete light theme is active. A future dark theme can override variables under `[data-theme="dark"]` without changing components.

## Typography and spacing

The safe Persian-first stack is Vazirmatn, IRANSansX, Tahoma, and Arial. Heading, title, body, label, and caption sizes have consistent Persian line heights. Spacing uses the 0–24 scale; operational cards use `--space-5` and responsive page padding.

## Radius and elevation

Inputs and buttons use the medium radius, cards use large radius, and badges/avatars use full radius. Default surfaces use borders and minimal elevation. Floating menus, drawers, and modal search use progressively stronger semantic shadows.

## Status presentation

Existing workflow statuses map to neutral, informational, success, warning, or danger surfaces. Status text is always displayed, so meaning never depends on color alone. No domain status was added or changed.

## RTL and responsive conventions

The document root owns `lang="fa"` and `dir="rtl"`. Layout uses logical properties such as `padding-inline` and `inset-inline-start`. Fixed breakpoints are 600px (large mobile), 900px (tablet), 1200px (laptop), and 1600px (large desktop). The desktop sidebar becomes a focus-contained drawer below 900px.

## Accessibility

Controls retain visible `:focus-visible` rings, interactive targets are at least 44px high, the shell includes a skip link and landmarks, overlays respond to Escape, the mobile drawer traps keyboard focus, and motion is disabled for `prefers-reduced-motion`. Error UI does not expose stacks or internal identifiers.

## Component conventions

Use design-system classes and primitives from `src/components/ui`. Do not introduce raw colors, arbitrary z-index values, emoji navigation icons, inline reusable styles, or role logic inside CSS. Feature pages should compose `PageHeader`, the shared content layouts, cards, badges, form foundations, loading skeletons, and empty/error states.
