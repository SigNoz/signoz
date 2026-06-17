# CSS Modules Guide

## Checklist Before Committing

- [ ] All class names use camelCase in CSS
- [ ] State classes use `is-`/`has-` prefix (e.g., `isActive`, `hasError`)
- [ ] No bracket access (`styles['...']`) in JS unless verified
- [ ] No dynamic class lookup - use explicit variant maps instead
- [ ] No deep class nesting (max 3 class levels; pseudo-classes/elements and parent-reference selectors like `&.active`, `&#bar` are not counted)
- [ ] No hardcoded colors - use `--l1/l2/l3-*` semantic tokens (not `--bg-*` primitives)
- [ ] No magic numbers - use `--spacing-*` tokens
- [ ] Typography uses `--periscope-font-size-*` or `--font-size-*` tokens
- [ ] @signozhq/ui overrides use CSS variables, not direct class overrides
- [ ] Global escapes only for third-party overrides
- [ ] No ID selectors
- [ ] No bare element selectors
- [ ] Keyframes use `:local(@keyframes name)` to avoid global collisions

## Config (vite.config.ts)

```ts
css: {
  modules: {
    localsConvention: 'camelCaseOnly',
  },
}
```

**Critical:** `camelCaseOnly` exports ONLY camelCase keys. Original kebab-case NOT accessible.

## Quick Reference

| CSS Class | JS Access | Works? | Preferred?                 |
|-----------|-----------|--------|----------------------------|
| `.alertHistory` | `styles.alertHistory` | Yes | Yes                        |
| `.alert-history` | `styles.alertHistory` | Yes | No, use `.alertHistory`    |
| `.alert-history` | `styles['alert-history']` | NO - undefined | Never, use `.alertHistory` |

## Bad Patterns

### Class Naming

```scss
// BAD: Bracket access won't work
.my-class { }
// Then in JS: styles['my-class'] -> undefined

// BAD: Collision - both become same key
.alertHistory { }
.alert-history { }  // -> styles.alertHistory (conflicts)

// BAD: Underscore inconsistency
.my_class { }  // -> styles.myClass (confusing)

// GOOD: Direct camelCase
.alertHistory { }
.statsCard { }

// GOOD: State classes with is-/has- prefix
.isDisabled { }
.isActive { }
.hasError { }
.isLoading { }
```

### Nesting

```scss
// BAD: Deep nesting - specificity wars, hard to override
.container {
  .wrapper {
    .inner {
      .content { }
    }
  }
}

// BAD: Nesting creates separate classes you might not expect
.button {
  .icon { }  // -> styles.icon (separate class, not scoped under .button)
}

// GOOD: Flat structure
.container { }
.containerWrapper { }
.containerContent { }

// GOOD: Nesting only for pseudo/states
.button {
  &:hover { }
  &:disabled { }
  &::before { }
}
```

### Global Escapes

```scss
// BAD: Overusing global
:global {
  .everything { }
  .in-here { }
  .is-global { }
}

// BAD: Global without necessity
:global(.myComponent) { }  // defeats purpose of modules

// GOOD: Targeted global for third-party overrides
.container {
  :global(.ant-modal-content) {
    padding: 0;
  }
}
```

### Selectors

```scss
// BAD: ID selectors - not reusable
#myComponent { }

// BAD: Element selectors without scope
div { }  // affects ALL divs in component

// BAD: Complex selectors
.container > div + span ~ p { }

// GOOD: Class-only selectors
.container { }
.title { }
```

### Variables & Values

```scss
// BAD: Hardcoded colors
.button {
  background: #1890ff;
  color: white;
}

// BAD: Magic numbers
.container {
  padding: 17px;
  margin-left: 43px;
}

// GOOD: Semantic tokens (theme-aware)
.button {
  background: var(--primary-background);
  color: var(--primary-foreground);
}

.card {
  background: var(--l2-background);
  color: var(--l2-foreground);
}

// GOOD: Spacing system
.container {
  padding: var(--spacing-4);
  margin-left: var(--spacing-5);
}
```

## Design Tokens (@signozhq/design-tokens)

Prefer semantic tokens over hardcoded values.

You can read the ./node_modules/@signozhq/design-tokens/dist/style.css to find complete list of available tokens.

### Spacing

```scss
// Spacing scale (index -> px):
// --spacing-0=0    --spacing-1=2    --spacing-2=4    --spacing-3=6    --spacing-4=8
// --spacing-5=10   --spacing-6=12   --spacing-7=14   --spacing-8=16   --spacing-10=20
// --spacing-12=24  --spacing-16=32  --spacing-20=40  --spacing-24=48  --spacing-32=64
// --spacing-40=80  --spacing-48=96  --spacing-56=112 --spacing-64=128
// (index != px; --spacing-2 is 4px, not 2px)
.container {
  padding: var(--spacing-4);      // 8px
  gap: var(--spacing-6);          // 12px
  margin-bottom: var(--spacing-8); // 16px
}

// Also available: --padding-* and --margin-* (rem-based)
// --padding-1 = 0.25rem, --padding-4 = 1rem, etc.
```

### Typography

```scss
// Font sizes (preferred)
.title {
  font-size: var(--periscope-font-size-large);   // 18px
  font-size: var(--periscope-font-size-medium);  // 16px
  font-size: var(--periscope-font-size-base);    // 13px
  font-size: var(--periscope-font-size-small);   // 11px
}

// Alternative scale (rem-based)
.heading {
  font-size: var(--font-size-xl);  // 1.25rem
  font-size: var(--font-size-lg);  // 1.125rem
  font-size: var(--font-size-base); // 1rem
  font-size: var(--font-size-sm);  // 0.875rem
}

// Font weights
.bold {
  font-weight: var(--font-weight-semibold); // 600
  font-weight: var(--font-weight-medium);   // 500
  font-weight: var(--font-weight-normal);   // 400
}

// Line heights
.text {
  line-height: var(--line-height-20); // 20px
  line-height: var(--line-height-24); // 24px
}
```

### Colors (Prefer Semantic Tokens)

Use L1/L2/L3 semantic tokens - they handle light/dark theme automatically.

```scss
// BAD: Primitive tokens (fixed value across themes, won't swap on theme change)
.card {
  background: var(--bg-ink-400);
  color: var(--text-vanilla-100);
}

// GOOD: L1/L2/L3 tokens (theme-aware - swap automatically light/dark)
.card {
  background: var(--l1-background);  // base layer
  color: var(--l1-foreground);       // primary text
}

.panel {
  background: var(--l2-background);  // elevated surface
  color: var(--l2-foreground);       // secondary text
  border-color: var(--l2-border);
}

.nested {
  background: var(--l3-background);  // nested/inset
  color: var(--l3-foreground);       // tertiary text
}

// Hover states
.card:hover {
  background: var(--l1-background-hover);
  color: var(--l1-foreground-hover);
}

// Semantic action colors (also theme-aware)
.primary {
  background: var(--primary-background);
  color: var(--primary-foreground);
}

.danger {
  background: var(--danger-background);
  color: var(--danger-foreground);
}

.success {
  background: var(--success-background);
  color: var(--success-foreground);
}

.warning {
  background: var(--warning-background);
  color: var(--warning-foreground);
}

// Accent colors (for highlights, badges, etc.)
.accent {
  background: var(--accent-primary);        // robin blue
  background: var(--accent-forest);         // green
  background: var(--accent-cherry);         // red
  background: var(--accent-amber);          // yellow
}
```

**Token hierarchy:**
- Primitive tokens (`--bg-*`, `--text-*`, etc.) have fixed values across themes.
- Semantic tokens (L1/L2/L3, `--primary-*`, `--danger-*`, etc.) automatically swap based on theme.
- L1 = base/root layer
- L2 = elevated surfaces (cards, panels)
- L3 = nested/inset elements

## Overriding @signozhq/ui Components

Components expose CSS variables for customization.

You can ensure they exist by looking at ./node_modules/@signozhq/ui/dist.
Never write a override without confirm it exists.

Override via:

### Method 1: CSS Variables (Preferred)

Each component exposes `--<component>-<property>` variables:

```scss
// Override Button
.customButton {
  --button-background: var(--success-background);
  --button-border-radius: var(--radius-2);
  --button-padding: var(--spacing-4) var(--spacing-8);
  --button-font-size: var(--periscope-font-size-base);
}

// Override Input
.customInput {
  --input-height: 2.5rem;
  --input-border-color: var(--l2-border);
  --input-padding: var(--spacing-2) var(--spacing-6);
  --input-placeholder-color: var(--l3-foreground);
}

// Override nested parts
.customInput {
  --input-prefix-padding: 0 var(--spacing-4) 0 var(--spacing-6);
  --input-suffix-color: var(--accent-primary);
}
```

### Method 2: Data Attributes

Components use data attributes for variants/states. Target them for state-specific overrides:

```scss
// Target variant
.wrapper :global([data-variant="outlined"]) {
  --button-border-color: var(--accent-primary);
}

// Target size
.wrapper :global([data-size="sm"]) {
  --button-font-size: var(--periscope-font-size-small);
}

// Target color
.wrapper :global([data-color="destructive"]) {
  --button-background: var(--danger-background);
}

// Target state (Radix patterns)
.popover :global([data-state="open"]) {
  opacity: 1;
}

.tooltip :global([data-side="top"]) {
  margin-bottom: var(--spacing-2);
}
```

### Common Component CSS Variables

**Button:**
- `--button-background`, `--button-border-radius`, `--button-padding`
- `--button-font-size`, `--button-height`, `--button-gap`
- `--button-hover-background`, `--button-disabled-opacity`

**Input:**
- `--input-height`, `--input-border-color`, `--input-background`
- `--input-padding`, `--input-font-size`, `--input-placeholder-color`
- `--input-focus-outline-color`, `--input-hover-border-color`
- `--input-prefix-*`, `--input-suffix-*` for adornments

**General pattern:** `--<component>-<property>` or `--<component>-<state>-<property>`

## Good Patterns

### Structure

```scss
// Flat, descriptive, component-scoped
.alertHistory { }
.alertHistoryHeader { }
.alertHistoryContent { }
.alertHistoryFooter { }

// State modifiers as separate classes
.alertHistory { }
.alertHistoryLoading { }
.alertHistoryEmpty { }
.alertHistoryError { }
```

### Composition

```scss
// GOOD: Composing styles
.baseButton {
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-2);
}

.primaryButton {
  composes: baseButton;
  background: var(--primary-background);
}
```

### Pseudo Elements

```scss
.button {
  // States
  &:hover { opacity: 0.9; }
  &:focus { outline: 2px solid var(--ring); outline-offset: 2px; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }

  // Pseudo elements
  &::before { content: ''; }
  &::after { content: ''; }
}
```

### Media Queries

```scss
.container {
  display: flex;
  flex-direction: column;
  
  @media (min-width: 768px) {
    flex-direction: row;
  }
}
```

### Keyframes (Local Scoping)

Without `:local()`, keyframe names are global and can clash across modules:

```scss
// BAD: Global keyframe - can conflict with other modules
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

// GOOD: Locally scoped keyframe
:local(@keyframes fadeIn) {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal {
  animation: fadeIn 200ms ease;
}
```

## JS Import Patterns

```tsx
// GOOD
import styles from './Component.module.scss';

<div className={styles.container}>
  <span className={styles.title}>Title</span>
</div>

// GOOD: Conditional classes
<div className={`${styles.button} ${isActive ? styles.buttonActive : ''}`}>

// GOOD: With clsx/classnames
<div className={clsx(styles.button, { [styles.buttonActive]: isActive })}>

// BAD: Bracket access (may be undefined)
<div className={styles['button-active']}>  // undefined if CSS has .button-active

// BAD: String interpolation for class names
<div className={`${styles.button}-active`}>  // won't work

// BAD: Dynamic class lookup - can't be statically analyzed
const cls = styles[`variant${props.type}`];  // Vite can't tree-shake or type-check

// GOOD: Explicit map for dynamic variants
const variantMap = {
  primary: styles.variantPrimary,
  secondary: styles.variantSecondary,
  ghost: styles.variantGhost,
};
const cls = variantMap[props.type];
```

## Lint Rules

### JS/TS (oxlint)

| Rule | Severity | Catches |
|------|----------|---------|
| `signoz/no-css-module-bracket-access` | warn | `styles['kebab-case']`, dynamic access |

### CSS/SCSS (stylelint)

| Rule | Severity | Catches |
|------|----------|---------|
| `local/no-deep-nesting` | warning | class nesting >3 levels (pseudo-classes/elements and parent-reference selectors `&.foo`, `&#bar` not counted; configurable via `maxDepth` secondary option) |
| `local/no-id-selectors` | error | `#id` selectors |
| `local/no-bare-element-selectors` | error | root-level `div`, `span` etc |
| `local/prefer-css-variables` | warning | hardcoded colors |
| `local/class-name-pattern` | warning | kebab-case, snake_case, PascalCase |

Run: `pnpm lint:styles` to check CSS modules.
