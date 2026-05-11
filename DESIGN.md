# Design Brief

## Direction

RKTR OHSE Command Center — industrial safety management platform with brutalist precision and glassmorphic refinement for manufacturing command center operations.

## Tone

Brutalist industrial meets refined digital craft: high-stakes safety interface designed with uncompromising precision, minimal ornamentation, and clarity over decoration.

## Differentiation

Glassmorphic cards on deep industrial navy create visual tension between commanding authority and modern digital elegance, making critical safety data instantly scannable.

## Color Palette

| Token | OKLCH | Role |
|-------|-------|------|
| background | 0.13 0.02 265 | Deep navy command center backdrop |
| foreground | 0.92 0.01 260 | High-contrast text for readability |
| card | 0.17 0.018 265 | Slightly elevated dark surface |
| primary | 0.6 0.23 155 | Safety green accent (critical) |
| accent | 0.65 0.24 155 | Safety green (primary actions) |
| secondary | 0.22 0.015 265 | Neutral industrial gray |
| muted | 0.22 0.015 265 | Deemphasized elements |
| destructive | 0.65 0.19 22 | Alert red for warnings/critical |
| border | 0.26 0.018 265 | Subtle industrial edges |

## Typography

- Display: Space Grotesk — technical authority and precision
- Body: General Sans — clarity and accessibility in mission-critical interface
- Mono: JetBrains Mono — code, metrics, technical data
- Scale: Hero `text-5xl font-bold`, H2 `text-3xl font-bold`, Label `text-xs uppercase tracking-widest`, Body `text-base`

## Elevation & Depth

Glassmorphic card surfaces with backdrop blur (5-15px) over dark navy create layered depth; subtle inset highlights mimic light diffusion through industrial safety glass.

## Structural Zones

| Zone | Background | Border | Notes |
|------|------------|--------|-------|
| Header | 0.17 0.018 265 | 0.26 0.018 265 1px | Sticky, navigation + search + status |
| Sidebar | 0.17 0.018 265 | 0.26 0.018 265 1px | Collapsible icons + labels |
| Content | 0.13 0.02 265 | — | Deep navy backdrop for card contrast |
| Cards | glass (white/5) | white/10 1px | Glassmorphic overlays, backdrop blur 10px |
| KPI Strip | card + glass effect | subtle accent border | Alternate green accent on critical KPIs |
| Footer | 0.17 0.018 265 | 0.26 0.018 265 1px | Legal, settings, session info |

## Spacing & Rhythm

Hierarchical spacing (8px, 16px, 24px, 32px) with dense KPI grid, spacious section gaps for visual breathing room; micro-interactions clarify workflow states.

## Component Patterns

- Buttons: Safety green primary, navy secondary, sharp 4px radius, uppercase labels, hover lift
- Cards: Glassmorphic with 10px backdrop blur, 1px white/10 border, 12px padding, inset highlight
- Badges: Accent green for active/approved, destructive red for critical, muted gray for draft
- KPI Counters: Monospaced animated transitions, trend arrows, sparkline mini-charts

## Motion

- Entrance: Subtle slide-in + fade (300ms cubic-bezier(0.4, 0, 0.2, 1))
- Hover: Card lift (16px shadow), accent glow on safety-critical elements
- Decorative: Pulse on alerts, float on KPI values during updates
- Transitions: Smooth all-properties 300ms for state changes

## Constraints

- Dark mode only (command center aesthetic)
- No decorative gradients or skews
- Safety green accent reserved for active, approved, critical-status indicators
- Glassmorphism only on cards, not text or buttons
- No animations below 300ms or above 800ms (command center requires snappy feedback)

## Signature Detail

Inset highlight on glassmorphic cards (white/10 border-top + subtle inset shadow) mimics safety glass diffusion, making cards feel embedded in the dashboard rather than floating — high-end manufacturing precision.
