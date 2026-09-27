---
name: Tactile Gamified EdTech
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3d4a3d'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#6d7b6c'
  outline-variant: '#bccbb9'
  surface-tint: '#006e2f'
  primary: '#006e2f'
  on-primary: '#ffffff'
  primary-container: '#22c55e'
  on-primary-container: '#004b1e'
  inverse-primary: '#4ae176'
  secondary: '#855300'
  on-secondary: '#ffffff'
  secondary-container: '#fea619'
  on-secondary-container: '#684000'
  tertiary: '#005ac2'
  on-tertiary: '#ffffff'
  tertiary-container: '#82abff'
  on-tertiary-container: '#003d88'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#6bff8f'
  primary-fixed-dim: '#4ae176'
  on-primary-fixed: '#002109'
  on-primary-fixed-variant: '#005321'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#ffb95f'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#d8e2ff'
  tertiary-fixed-dim: '#adc6ff'
  on-tertiary-fixed: '#001a42'
  on-tertiary-fixed-variant: '#004395'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-xl:
    fontFamily: Rubik
    fontSize: 44px
    fontWeight: '800'
    lineHeight: 52px
  headline-xl-mobile:
    fontFamily: Rubik
    fontSize: 30px
    fontWeight: '800'
    lineHeight: 38px
  headline-lg:
    fontFamily: Rubik
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Rubik
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Rubik
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
  body-lg:
    fontFamily: Nunito Sans
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 28px
  body-md:
    fontFamily: Nunito Sans
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-sm:
    fontFamily: Nunito Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-lg:
    fontFamily: Rubik
    fontSize: 15px
    fontWeight: '700'
    lineHeight: 20px
  label-md:
    fontFamily: Rubik
    fontSize: 13px
    fontWeight: '700'
    lineHeight: 18px
  label-sm:
    fontFamily: Rubik
    fontSize: 11px
    fontWeight: '800'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-desktop: 2rem
  margin: 1rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system takes heavy inspiration from playful, gamified micro-learning platforms, combining vibrant character-driven charm with tactile, pressable affordances. Built for learners conquering complex digital domains—such as Python, Web Development, Data Science, and Machine Learning—the interface replaces intimidation and dry technical documentation with approachable, joyful interaction patterns.

The visual direction centers on **Tactile Gamification**:
- **Chunky & Physical**: Elements feel like physical toy pieces or arcade triggers. Buttons, path nodes, and selection cards feature bold bottom-edge "chunky" borders (`border-b-4`) that depress smoothly on click or tap, providing instantaneous, satisfying tactile feedback.
- **Supportive & Celebratory**: Streaks, XP gems, level nodes, and mascot celebrations are visual centerpieces, transforming coding exercises into rewarding quests.
- **Clean Structure**: Despite its rounded and energetic appearance, typography and layouts maintain crisp contrast and high legibility to ensure complex code blocks, quiz options, and curriculum trees remain crystal clear.

## Colors

The palette is anchored by a spirited, energetic green, backed by rich secondary warmth and playful tech accents, resting upon a clean, mint-tinted backdrop.

### Color Roles
- **Primary (`#22c55e`)**: Used for the primary call-to-action buttons, completed lesson states, progress indicators, and active course paths. Paired with a darker underside tone (`#15803d` or `#16a34a`) to create the 3D tactile button push.
- **Secondary (`#f59e0b`)**: The spark of motivation. Applied to streak flame counters, XP tokens, bonus milestones, and celebratory banners. Bottom edge bevels use `#d97706`.
- **Tertiary (`#3b82f6`)**: Represents logic, data, and interactive digital tracks. Applied to technical tag pills (e.g., Python, Data Science badges), informational modals, and alternate action states. Bottom edge bevels use `#1d4ed8`.
- **Neutral Surface & Background (`#f8faf9` to `#ffffff`)**: Canvas background uses `#f8faf9` (an ultra-soft, cool mint white) to relieve eye fatigue. Primary cards and interaction layers sit crisp in `#ffffff`.
- **Text & Stroke (`#0f172a` and `#e2e8f0`)**: Primary titles and labels use deep slate `#0f172a` for readable, punchy text. Subtle structural containers use `#e2e8f0` with base borders in `#cbd5e1` to preserve physical card definition.

## Typography

The type system blends the friendly, rounded, geometric punch of **Rubik** for all display headlines, button actions, and progress tags, with the legibility of **Nunito Sans** for longer descriptive passages, quiz instructions, and body copy.

- **Headlines (`Rubik`)**: Weighted heavily at 700 and 800 with tight line-heights. Keeps hero claims, level titles, and milestone banners dynamic and engaging.
- **Body (`Nunito Sans`)**: Rounded letterforms maintain harmony with the mascot and tactile buttons, but with taller x-heights and open apertures to ensure technical terminology and code prompts are effortless to read.
- **Labels & Microcopy (`Rubik`)**: Used in all-caps or capitalized title styling (`label-lg`, `label-md`) across buttons, status badges, XP multipliers, and navigation pills.

## Layout & Spacing

The layout model is organized around a centered, max-width fluid container system (max-width `1200px` for landing and dashboards, `680px` for focused quiz and lesson pathways):

- **Column System**: 12-column responsive layout on desktop with `2rem` gutters; collapsible to a single fluid column on mobile with `1rem` lateral margins.
- **Curriculum & Lesson Path Rhythm**: Lesson paths use a central serpentine alignment where level nodes alternate offsets (`-24px`, `0px`, `+24px`) along an explicit SVG progress track line.
- **Vertical Hierarchy**: Generous `2.5rem` (`space-xl`) breaks between modules and lesson units, with tight `0.5rem` (`space-sm`) gaps between question cards and interactive choice buttons.

## Elevation & Depth

This design system avoids blurry realistic drop shadows in favor of **isometric tactile extrusion**:

- **Physical 3D Buttons**: Buttons use a solid bottom border (`border-b-[4px]`) in a darker shade of the element's base color (e.g., `#16a34a` base over `#15803d` bevel). On `:active`, the element transforms down `2px` (`translate-y-[2px]`) and reduces the bottom border to `2px`, mimicking an arcade microswitch.
- **Tactile Cards**: Elevated white containers sit on a 2px outer border `#e2e8f0` coupled with a solid 4px base shelf (`border-b-4 border-[#cbd5e1]`), giving each card a toy-brick physical presence.
- **Floating Badges & Mascot Highlights**: Mascot speech bubbles and streak popovers use a crisp dual border with an ambient soft-glow backing (`0 8px 24px -4px rgba(34, 197, 94, 0.18)`), creating focus without cluttering the screen.

## Shapes

The design uses a friendly, hyper-approachable rounded aesthetic:

- **Interactive Primary Elements (`rounded-2xl` / `1rem`)**: Lesson cards, choice answer options, and primary buttons use standard `1rem` corner radii for smooth, safe ergonomics.
- **Gamified Badges & Pill Buttons (`rounded-full` / `9999px`)**: XP counters, streak flame pills, language/tech stack tags, and circular path nodes use fully pill-shaped envelopes.
- **Progress Trackers**: Progress bar tracks and indicator fills utilize fully rounded caps (`rounded-full`) to maintain an organic, fluid fill animation.

## Components

### Buttons
- **Primary Chunky Button**: Background `#22c55e`, border-bottom `4px solid #15803d`, text `#ffffff`, font `Rubik 700`, uppercase tracking. On press: `translate-y-[2px]`, border-bottom `2px solid #15803d`.
- **Secondary Outline Button**: Background `#ffffff`, border `2px solid #e2e8f0`, border-bottom `4px solid #cbd5e1`, text `#0f172a`. On hover: border-color `#94a3b8`.
- **Action Yellow Button**: Background `#f59e0b`, border-bottom `4px solid #d97706`, text `#ffffff`. Used for "Boost", "Claim XP", and daily rewards.

### Interactive Choice Cards (Quizzes & Coding Prompts)
- Multi-choice quiz items feature rounded-2xl containers with `2px solid #e2e8f0` and `border-b-4 solid #cbd5e1`.
- **Active / Selected State**: Border color `#3b82f6`, background `#eff6ff`, border-bottom `4px solid #2563eb`, with a bright blue check pill indicator.
- **Correct State**: Border color `#22c55e`, background `#f0fdf4`, border-bottom `4px solid #15803d`.
- **Incorrect State**: Border color `#ef4444`, background `#fef2f2`, border-bottom `4px solid #b91c1c`.

### Level Path Nodes (Learning Map)
- Circular buttons (`w-16 h-16 rounded-full`), elevated with a `border-b-[6px]`.
- Star or check icon centered within.
- Floating animated ring around active level node; completed nodes show shiny green checkmarks; locked nodes are muted grey (`#cbd5e1`) with flat bottom edges.

### Gamification & Header Badges
- **Streak Pill**: Rounded-full pill containing a warm orange fire icon, displaying streak days (e.g., "7") in bold `Rubik`.
- **XP Pill**: Rounded-full pill featuring a cyan/blue diamond gem with real-time numeric counter.
- **Hearts / Lives**: Crimson badge (`#ef4444`) with heart icons signifying remaining attempts.

### Progress Bar
- Container height `16px`, background `#e2e8f0`, rounded-full.
- Fill bar: Vibrant green `#22c55e` with an inner top highlight stripe (`rgba(255,255,255,0.3)`) to give it a 3D cylindrical capsule look.