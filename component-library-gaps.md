# `@signozhq/ui` — Base-Level Component Gap Analysis

> **Purpose:** Track base-level (foundational) components that are missing from the
> [`signoz/components`](https://github.com/signoz/components) library so they can be
> raised as individual GitHub issues or picked up for research.
>
> **Method:** The library is built on **shadcn/ui + Radix** (the `pnpm turbo gen`
> generator offers an "import from shadcn" path), so shadcn's registry is used as the
> yardstick for "base-level." Each candidate is cross-checked against **actual usage in
> the SigNoz product** (`frontend/src`, currently antd-based) to confirm it is a real
> need and not theoretical. Usage counts below are indicative (file/occurrence counts
> from `grep`), not exact.

---

## Current inventory (37 components)

`alert-dialog` · `announcement-banner` · `avatar` · `badge` · `breadcrumb` · `button` ·
`calendar` · `callout` · `checkbox` · `combobox` · `command` · `date-picker` · `dialog` ·
`divider` · `drawer` · `dropdown-menu` · `input` · `input-number` · `kbd` · `pagination` ·
`pin-list` · `popover` · `progress` · `radio-group` · `resizable` · `select` · `skeleton` ·
`slider` · `sonner` · `switch` · `table` · `tabs` · `text-ellipsis` · `toggle` ·
`toggle-group` · `tooltip` · `typography`

### Already covered under a different name (NOT gaps)

| Standard name | Provided as | Notes |
| --- | --- | --- |
| Separator | `divider` | Same primitive. |
| Sheet | `drawer` | Drawer covers the side-panel use case. |
| Toast | `sonner` (`Toaster`) | Sonner is the toast system. |
| Data Table | `table` | Table + `@tanstack/react-virtual` covers data-grid needs. |
| Alert (inline) | `callout` / `announcement-banner` | Partial — see notes in Tier 2. |

---

## Summary of gaps

| Priority | Component | shadcn/Radix primitive | Product usage signal |
| --- | --- | --- | --- |
| **P0** | Textarea | ✅ shadcn `textarea` | ~119 `TextArea` refs |
| **P0** | Card | ✅ shadcn `card` | `Card` in ~204 files |
| **P0** | Label | ✅ shadcn `label` (Radix) | pairs with nearly every form control |
| **P0** | Accordion / Collapsible | ✅ shadcn `accordion` + `collapsible` (Radix) | `Collapse` in ~69 files |
| **P0** | Spinner / Loader | ➖ custom (no shadcn primitive) | ~34 `<Spin>` |
| **P1** | Scroll Area | ✅ shadcn `scroll-area` (Radix) | standard primitive |
| **P1** | Empty / Empty-state | ➖ custom | `Empty` in ~258 files |
| **P1** | Hover Card | ✅ shadcn `hover-card` (Radix) | rich hover content |
| **P1** | Context Menu | ✅ shadcn `context-menu` (Radix) | right-click menus |
| **P2** | Form | ✅ shadcn `form` (react-hook-form) | `Form` in ~590 files |
| **P2** | Stepper / Steps | ➖ custom | `Steps` in ~24 files |
| **P2** | Timeline | ➖ custom | `Timeline` in ~34 files |
| **P2** | Tag | overlaps `badge` | `Tag` in ~298 files — needs a decision |

Recommended build order (respects dependencies):
**Label → Textarea → Card → Spinner → Accordion/Collapsible → Scroll Area → Empty → Hover Card → Context Menu → Form.**

---

## P0 — Foundational, high real usage

### 1. Textarea

- **Summary:** Multi-line text input — the direct counterpart to the existing `Input`. A form kit without one is incomplete.
- **Why base-level:** Part of the minimal HTML form-control set; present in every mainstream component library.
- **Evidence:** `Input.TextArea` / `TextArea` referenced ~119 times in `frontend/src`. No equivalent exists in `@signozhq/ui`.
- **Reference:** shadcn `textarea` (styled native `<textarea>`).
- **Proposed API:**
  ```tsx
  <Textarea placeholder="Description" rows={4} disabled />
  ```
  Support standard `textarea` props, `disabled`, error/invalid state, and (optionally) auto-resize.
- **Acceptance criteria:**
  - [ ] Exported from `@signozhq/ui` via subpath `./textarea`.
  - [ ] Themed with `--textarea-*` CSS tokens documented in `index.ts` (`css-tokens` region).
  - [ ] Storybook story covering default / disabled / invalid / with-label.
  - [ ] Keyboard + a11y parity with `Input`.

### 2. Card

- **Summary:** The primary surface/container primitive (header, content, footer sub-parts).
- **Why base-level:** The default way to group content; one of the most-used shadcn components.
- **Evidence:** `Card` referenced in ~204 files in `frontend/src`.
- **Reference:** shadcn `card` (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`).
- **Proposed API:**
  ```tsx
  <Card>
    <CardHeader><CardTitle>Title</CardTitle></CardHeader>
    <CardContent>…</CardContent>
    <CardFooter>…</CardFooter>
  </Card>
  ```
- **Acceptance criteria:**
  - [ ] Compound component with header/content/footer sub-parts.
  - [ ] `--card-*` tokens (background, border, radius, shadow) documented.
  - [ ] Storybook stories: basic, with footer actions, interactive/clickable.

### 3. Label

- **Summary:** Accessible form-control label bound to an input via `htmlFor` / Radix `Label`.
- **Why base-level:** Required for accessible forms. Today only `radio-group` ships its own `RadioGroupLabel`; there is **no shared `Label`** to pair with Input, Checkbox, Switch, Select, Textarea, etc.
- **Evidence:** No standalone `Label` export in `@signozhq/ui` (`grep` of every `index.ts`). Needed by essentially every form field.
- **Reference:** shadcn `label` (wraps `@radix-ui/react-label`).
- **Proposed API:**
  ```tsx
  <Label htmlFor="email">Email</Label>
  <Input id="email" />
  ```
  Include required/optional indicator and disabled styling.
- **Acceptance criteria:**
  - [ ] Standalone `Label` export.
  - [ ] Clicking the label focuses the associated control.
  - [ ] `--label-*` tokens documented.
  - [ ] Consider migrating `RadioGroupLabel` to compose the shared `Label`.

### 4. Accordion / Collapsible

- **Summary:** Expand/collapse container(s). `Collapsible` = single toggle region; `Accordion` = grouped, optionally single-open.
- **Why base-level:** Standard disclosure pattern; both are core Radix primitives.
- **Evidence:** antd `Collapse` referenced in ~69 files in `frontend/src`. Neither `accordion` nor `collapsible` exists in the library.
- **Reference:** shadcn `accordion` + `collapsible` (Radix `@radix-ui/react-accordion`, `@radix-ui/react-collapsible`).
- **Proposed API:**
  ```tsx
  <Accordion type="single" collapsible>
    <AccordionItem value="a">
      <AccordionTrigger>Section</AccordionTrigger>
      <AccordionContent>…</AccordionContent>
    </AccordionItem>
  </Accordion>
  ```
- **Acceptance criteria:**
  - [ ] Both `Accordion` and `Collapsible` exported (can be one or two subpaths).
  - [ ] `type="single" | "multiple"`, controlled + uncontrolled.
  - [ ] Animated open/close; keyboard navigation.
  - [ ] `--accordion-*` tokens documented.

### 5. Spinner / Loader

- **Summary:** Indeterminate loading indicator.
- **Why base-level:** Fundamental async-state affordance. The library has `Skeleton` and `Progress` (determinate) but **no simple spinner**.
- **Evidence:** antd `<Spin>` used ~34 times in `frontend/src`.
- **Reference:** No dedicated shadcn primitive (usually a `Loader2` lucide icon + `animate-spin`). Implement as a small custom component using `@signozhq/icons`.
- **Proposed API:**
  ```tsx
  <Spinner size="sm" />
  <Spinner size="lg" label="Loading dashboards…" />
  ```
- **Acceptance criteria:**
  - [ ] Size variants (`sm`/`md`/`lg`) + optional label.
  - [ ] `role="status"` / `aria-live` for a11y.
  - [ ] Respects `prefers-reduced-motion`.
  - [ ] `--spinner-*` tokens documented.

---

## P1 — Common primitives worth adding

### 6. Scroll Area

- **Summary:** Cross-browser styled scroll container with custom scrollbars.
- **Why base-level:** Standard shadcn/Radix primitive; keeps scrollbars visually consistent across OSes inside popovers, menus, and panels.
- **Reference:** shadcn `scroll-area` (`@radix-ui/react-scroll-area`).
- **Acceptance criteria:**
  - [ ] Vertical + horizontal support.
  - [ ] Themed scrollbar via `--scroll-area-*` tokens.
  - [ ] Storybook story inside a fixed-height container.

### 7. Empty / Empty-state

- **Summary:** Placeholder for no-data / no-results views (icon/illustration + title + description + optional action).
- **Why base-level:** Ubiquitous across lists, tables, search results.
- **Evidence:** antd `Empty` referenced in ~258 files in `frontend/src`.
- **Reference:** No shadcn primitive — custom, composed from `Typography` + `Button` + `@signozhq/icons`.
- **Acceptance criteria:**
  - [ ] Slots for icon/illustration, title, description, action.
  - [ ] Compact + default sizes.
  - [ ] `--empty-*` tokens documented.

### 8. Hover Card

- **Summary:** Rich content revealed on hover (unlike `Tooltip`, which is text-only and pointer/focus-triggered).
- **Reference:** shadcn `hover-card` (`@radix-ui/react-hover-card`).
- **Acceptance criteria:**
  - [ ] Open/close delay props.
  - [ ] Arbitrary JSX content, positioning via Radix.
  - [ ] `--hover-card-*` tokens documented.

### 9. Context Menu

- **Summary:** Right-click / long-press menu. Library currently only has `DropdownMenu` (click-triggered).
- **Reference:** shadcn `context-menu` (`@radix-ui/react-context-menu`).
- **Acceptance criteria:**
  - [ ] Items, sub-menus, separators, checkbox/radio items (mirror `DropdownMenu` API).
  - [ ] Keyboard navigation + a11y.
  - [ ] `--context-menu-*` tokens documented.

---

## P2 — Product-shaped, larger scope

### 10. Form

- **Summary:** Form composition + validation wrapper (field, label, description, error message) over the existing controls.
- **Why here (not P0):** Highest raw usage (`Form` in ~590 files) but it is an **abstraction over primitives** — depends on `Label` + `Textarea` landing first. Larger design decision (bind to react-hook-form like shadcn, or a lighter wrapper).
- **Reference:** shadcn `form` (react-hook-form + zod).
- **Acceptance criteria:**
  - [ ] `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`.
  - [ ] Works with Input, Textarea, Select, Checkbox, RadioGroup, Switch, Combobox.
  - [ ] Documented validation story.

### 11. Stepper / Steps

- **Summary:** Multi-step progress indicator for wizards/onboarding.
- **Evidence:** antd `Steps` used ~24 times.
- **Reference:** No shadcn primitive — custom.
- **Acceptance criteria:** horizontal + vertical, states (done/active/pending/error), optional descriptions.

### 12. Timeline

- **Summary:** Vertical sequence of events (used in trace / activity views).
- **Evidence:** antd `Timeline` used ~34 times.
- **Reference:** No shadcn primitive — custom.
- **Acceptance criteria:** items with dot/icon, label, content; color states; alternating layout optional.

### 13. Tag (decision needed)

- **Summary:** Colored / closable label. May overlap with existing `Badge`.
- **Evidence:** antd `Tag` used in ~298 files.
- **Action:** Decide whether `Badge` should gain `closable` + color variants, **or** add a distinct `Tag`. Not necessarily a new component — resolve the overlap first.

---

## Notes on `Alert` (inline)

antd `Alert` appears in many files by substring, but actual inline `<Alert>` JSX usage is small, and the library already ships `callout` and `announcement-banner`. **Recommendation:** document `callout` as the inline-alert answer rather than adding a new component, unless a specific gap (e.g. dismissible inline alert with action) is identified.

---

## How to add a component (for reference)

Per `CONTRIBUTING.md` in `signoz/components`:

1. `pnpm turbo gen` → select `new-component` → enter kebab-case name → choose "import from shadcn" or "from scratch". The generator wires up the folder, `index.ts` export, `vite.config.ts` entry, `pnpm install`, and a Storybook story.
2. Add `--{component}-*` CSS tokens, then run `pnpm run tokens` (in `packages/ui`) to regenerate the token JSDoc tables. CI runs `pnpm run tokens:check`.
3. Add/verify the Storybook story in `apps/docs/stories/`.
4. `pnpm build && pnpm dev` to verify, then open a PR (releases are driven by Release Please).
