# Migration: Individual `@signozhq/*` packages → `@signozhq/ui`

All components from the individual `@signozhq/*` packages are re-exported from `@signozhq/ui@0.0.5`. This document tracks the migration of 14 standalone packages (109 import sites).

---

## Overview

| # | Package | Files | Compat | Effort | Key Issue |
|---|---|---|---|---|---|
| 1 | `@signozhq/button` | 40 | Breaking | High | `prefixIcon`→`prefix`, `suffixIcon`→`suffix`, sizes `XS`/`LG` removed, enum→const, HTML attrs narrowed |
| 2 | `@signozhq/input` | 24 | Breaking | Medium | `inputVariants` removed, `theme` removed, HTML attrs narrowed, `prefix`/`suffix` added |
| 3 | `@signozhq/callout` | 11 | Breaking | High | `message`→`title`, `description`→`children`, `dismissable`/`onClose`→`action`/`onClick` |
| 4 | `@signozhq/dialog` | 9 | Partial | Low | `DialogWrapper`/`DialogFooter` backward-compatible; `AlertDialogWrapper` removed |
| 5 | `@signozhq/toggle-group` | 8 | Breaking | High | Entirely new API: `type` discriminant required, `variant`→`color`, Radix `onValueChange`→`onChange` |
| 6 | `@signozhq/checkbox` | 6 | Breaking | Medium | `checked`→`value`, `onCheckedChange`→`onChange`, `labelName`→`children` |
| 7 | `@signozhq/drawer` | 2 | Breaking | High | Rewritten (vaul→Dialog); `DrawerWrapper` props completely restructured |
| 8 | `@signozhq/radio-group` | 2 | Breaking | Medium | `onValueChange`→`onChange`, `color` moved item→group, HTML attrs narrowed |
| 9 | `@signozhq/resizable` | 2 | Breaking | High | Different react-resizable-panels version; `direction`→`orientation`, callbacks changed |
| 10 | `@signozhq/command` | 1 | Additive | Low | `CommandLoading` added, `CommandItem` `prefix`/`suffix` retyped |
| 11 | `@signozhq/combobox` | 1 | Breaking | Medium | `ComboboxLabel` removed, `showCheck` removed, trigger props broadened |
| 12 | `@signozhq/calendar` | 1 | Breaking | Low | `buttonVariant` removed, `CalendarDayButton` props redefined |
| 13 | `@signozhq/popover` | 1 | Identical | None | Functionally identical |
| 14 | `@signozhq/table` | 1 | Additive | None | `initialColumnOrder`, `testId` added; fully backward-compatible |

---

## Detailed Interface Differences

### 1. `@signozhq/button` (v0.0.5 → UI v0.0.5) — 40 files

#### Deleted exports
| Export | Type | Notes |
|---|---|---|
| `ButtonSize.XS` | enum member `"xs"` | Removed entirely |
| `ButtonSize.LG` | enum member `"lg"` | Removed entirely |

#### Deleted props on `Button`
| Prop | Old Type | Notes |
|---|---|---|
| `prefixIcon` | `React.ReactElement` | Use `prefix` instead |
| `suffixIcon` | `React.ReactElement` | Use `suffix` instead |
| `width` | `string` | Removed, no replacement |

#### Added exports
| Export | Type | Notes |
|---|---|---|
| `ButtonVariantValue` | type alias | `(typeof ButtonVariant)[keyof typeof ButtonVariant]` |
| `ButtonSizeValue` | type alias | `(typeof ButtonSize)[keyof typeof ButtonSize]` |
| `ButtonBackgroundValue` | type alias | `(typeof ButtonBackground)[keyof typeof ButtonBackground]` |
| `ButtonColorValue` | type alias | `(typeof ButtonColor)[keyof typeof ButtonColor] \| (string & {})` |
| `ButtonColor.None` | const member `"none"` | New color option |

#### Added props on `Button`
| Prop | Type | Notes |
|---|---|---|
| `prefix` | `React.ReactElement` | Replaces `prefixIcon` |
| `suffix` | `React.ReactElement` | Replaces `suffixIcon` |
| `color` | `ButtonColorValue` | New |
| `testId` | `string` | New |

#### Changed interfaces
| Item | Standalone | `@signozhq/ui` |
|---|---|---|
| `ButtonVariant` | `enum { Solid, Outlined, Dashed, Ghost, Link, Action }` | `const { readonly Solid: "solid", ... }` |
| `ButtonSize` | `enum { XS, SM, MD, LG, Icon }` | `const { readonly SM: "sm", MD: "md", Icon: "icon" }` |
| `ButtonBackground` | `enum { Ink500, Ink400, Vanilla100, Vanilla200 }` | `const { readonly Ink500: "ink-500", ... }` (same values) |
| `ButtonColor` | `enum { Primary, Destructive, Warning, Secondary }` | `const { readonly Primary, Destructive, Warning, Secondary, None }` |
| `ButtonProps.variant` | `ButtonVariantProps['variant'] \| string` | `ButtonVariantValue` (restricted to known values) |
| `ButtonProps.size` | `ButtonVariantProps['size'] \| string` | `ButtonSizeValue` (restricted, no `xs`/`lg`) |
| `ButtonProps.background` | `ButtonBackground \| string` | `ButtonBackgroundValue` (restricted) |
| `ButtonProps` base | `extends React.ButtonHTMLAttributes<HTMLButtonElement>` | `Pick<..., 'disabled' \| 'onClick' \| 'className' \| 'children' \| 'onDoubleClick' \| 'type' \| 'id' \| 'tabIndex' \| 'title'> & React.AriaAttributes` |
| `buttonVariants` | CVA: `({variant?, size?} & ClassProp) => string` | `({variant?: ButtonVariantValue, size?: ButtonSizeValue, className?: string}) => string` |

---

### 2. `@signozhq/input` (v0.0.4 → UI v0.0.5) — 24 files

#### Deleted exports
| Export | Type | Notes |
|---|---|---|
| `inputVariants` | CVA function | Not in UI — used in 1 file (`CreateRoleModal.tsx`) |
| `InputComponent` | component | Not re-exported; use `Input` directly |
| `InputPassword` | component | Not re-exported; use `Input.Password` |

#### Deleted props on `Input`
| Prop | Old Type | Notes |
|---|---|---|
| `theme` | `"light" \| "dark" \| null` | From `VariantProps<typeof inputVariants>` — removed |
| (all unlisted HTML input attrs) | various | e.g. `style`, `onMouseEnter`, `draggable`, `data-*` — narrowed from full `InputHTMLAttributes` to explicit Pick |

#### Added exports
| Export | Type | Notes |
|---|---|---|
| `InputPasswordProps` | type | `Omit<InputProps, 'type' \| 'ref'>` |

#### Added props on `Input`
| Prop | Type | Notes |
|---|---|---|
| `prefix` | `React.ReactNode` | Adornment before input |
| `suffix` | `React.ReactNode` | Adornment after input |

#### Changed interfaces
| Item | Standalone | `@signozhq/ui` |
|---|---|---|
| `InputProps` base | `extends React.InputHTMLAttributes<HTMLInputElement>, VariantProps<typeof inputVariants>` | `Pick<React.ComponentPropsWithoutRef<'input'>, 60 specific props> & React.AriaAttributes & { prefix?, suffix? }` |
| `InputPasswordProps` | `Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & VariantProps<...>` | `Omit<InputProps, 'type' \| 'ref'>` |

**Explicitly allowed props in UI `InputProps`**: `id`, `className`, `accept`, `autoComplete`, `autoCorrect`, `autoFocus`, `autoCapitalize`, `autoSave`, `disabled`, `capture`, `form`, `formNoValidate`, `max`, `maxLength`, `min`, `minLength`, `multiple`, `name`, `pattern`, `placeholder`, `readOnly`, `required`, `size`, `step`, `type`, `value`, `defaultValue`, `enterKeyHint`, `hidden`, `lang`, `tabIndex`, `title`, `translate`, `inputMode`, `onCopy`, `onCopyCapture`, `onCut`, `onCutCapture`, `onPaste`, `onPasteCapture`, `onFocus`, `onFocusCapture`, `onBlur`, `onBlurCapture`, `onChange`, `onChangeCapture`, `onBeforeInput`, `onBeforeInputCapture`, `onInput`, `onInputCapture`, `onReset`, `onResetCapture`, `onSubmit`, `onSubmitCapture`, `onInvalid`, `onInvalidCapture`, `onKeyDown`, `onKeyDownCapture`, `onKeyUp`, `onKeyUpCapture`, `onSelect`, `onSelectCapture`, `onClick`, `onClickCapture` + all `aria-*` attributes.

---

### 3. `@signozhq/callout` (v0.0.4 → UI v0.0.5) — 11 files

#### Deleted props
| Prop | Old Type | Notes |
|---|---|---|
| `message` | `React.ReactNode` | Use `title` instead |
| `description` | `React.ReactNode` | Use `children` instead |
| `dismissable` | `boolean` | Use `action: 'dismissible'` instead |
| `onClose` | `() => void` | Use `onClick` instead |
| (all unlisted div attrs) | various | Narrowed from `extends React.ComponentProps<'div'>` to Pick |

#### Added exports
| Export | Type | Notes |
|---|---|---|
| `CalloutColor` | type | `'robin' \| 'forest' \| 'amber' \| 'cherry' \| 'sakura' \| 'aqua'` |
| `CalloutProps` | type | Exported (was not exported from standalone) |

#### Added props
| Prop | Type | Notes |
|---|---|---|
| `title` | `React.ReactNode` | Replaces `message` |
| `action` | `'none' \| 'dismissible' \| 'expandable'` | Replaces `dismissable` boolean |
| `defaultExpanded` | `boolean` | For `action: 'expandable'` |
| `onClick` | `() => void` | Replaces `onClose` |
| `testId` | `string` | New |

#### Changed interfaces
| Item | Standalone | `@signozhq/ui` |
|---|---|---|
| `CalloutProps` base | `extends React.ComponentProps<'div'>` | `Pick<React.ComponentProps<'div'>, 'id' \| 'className' \| 'children'>` |
| `color` | `string` | `CalloutColor \| (string & {})` (typed union with autocomplete) |

#### Migration map
```
message      →  title
description  →  children
dismissable  →  action: 'dismissible'
onClose      →  onClick
```

---

### 4. `@signozhq/dialog` (v0.0.4 → UI v0.0.5) — 9 files

#### Deleted exports
| Export | Type | Notes |
|---|---|---|
| `AlertDialogWrapper` | component | Replaced by `ConfirmDialog` |

#### Deleted props
| Component | Prop | Notes |
|---|---|---|
| `DialogContent` | `showCloseButton` | Use `DialogCloseButton` component instead |

#### Added exports
| Export | Type | Notes |
|---|---|---|
| `ConfirmDialog` | component | Replaces `AlertDialogWrapper` |
| `ConfirmDialogUrl` | component | URL-driven confirm dialog |
| `DialogCloseButton` | component | Standalone close button |
| `DialogSubtitle` | component | Subtitle element |
| `DialogPositionValue` | const | `Record<Capitalize<DialogPosition>, DialogPosition>` |
| All named prop types | types | `DialogProps`, `DialogContentProps`, `DialogFooterProps`, etc. |
| `DialogPosition`, `DialogSize`, `DialogHeightMode`, `DialogAnimation` | types | New layout/animation types |

#### Added props on `DialogWrapper` (backward-compatible)
| Prop | Type | Notes |
|---|---|---|
| `subTitle` | `string` | New |
| `footer` | `React.ReactNode` | New |
| `showOverlay` | `boolean` | New |

#### Added props on `DialogContent`
| Prop | Type | Notes |
|---|---|---|
| `position` | `'top' \| 'center' \| 'left' \| 'right' \| 'bottom'` | New |
| `offset` | `number` | New |
| `heightMode` | `'content' \| 'full'` | New |
| `showOverlay` | `boolean` | New |
| `animation` | `'fade' \| 'zoom' \| 'slide'` | New |
| `onDismiss` | `() => void` | New |
| `onEscapeKeyDown`, `onPointerDownOutside`, `onFocusOutside`, `onInteractOutside`, `onOpenAutoFocus`, `onCloseAutoFocus` | Radix event handlers | Explicitly allowlisted |
| `testId` | `string` | New |

#### Changed interfaces
| Component | Standalone | `@signozhq/ui` |
|---|---|---|
| `Dialog` | `React.ComponentProps<typeof DialogPrimitive.Root>` | `{ children?, open?, defaultOpen?, onOpenChange?, modal? }` |
| `DialogTrigger` | `React.ComponentProps<typeof DialogPrimitive.Trigger>` | `Pick<..., 'id' \| 'className' \| 'onClick' \| 'asChild' \| 'children'> & { testId? }` |
| `DialogClose` | `React.ComponentProps<typeof DialogPrimitive.Close>` | `Pick<..., 'id' \| 'className' \| 'style' \| 'onClick' \| 'asChild' \| 'children'> & { testId? }` |
| `DialogOverlay` | `React.ComponentProps<typeof DialogPrimitive.Overlay>` | `Pick<..., 'id' \| 'className' \| 'style'> & { forceMount?, testId? }` |
| `DialogContent` | `React.ComponentProps<typeof DialogPrimitive.Content> & { showCloseButton?, width? }` | `Pick<..., 'id' \| 'className' \| 'style' \| 'asChild' \| 'children'> & { explicit event handlers, layout props, testId }` |
| `DialogHeader` | `React.ComponentProps<'div'>` | `Pick<..., 'id' \| 'className' \| 'style' \| 'children'> & { testId? }` |
| `DialogFooter` | `React.ComponentProps<'div'>` | `Pick<..., 'id' \| 'className' \| 'style' \| 'children'> & { testId? }` |
| `DialogTitle` | `React.ComponentProps<typeof DialogPrimitive.Title> & { icon? }` | `Pick<..., 'id' \| 'className' \| 'style' \| 'children'> & { testId?, icon? }` |
| `DialogDescription` | `React.ComponentProps<typeof DialogPrimitive.Description>` | `Pick<..., 'id' \| 'className' \| 'style' \| 'children'> & { testId? }` |
| `DialogPortal` | `React.ComponentProps<typeof DialogPrimitive.Portal>` | `{ children?, container?, forceMount?, testId? }` |
| `DialogWrapper` | `{ title?, children, open?, onOpenChange?, trigger?, className?, showCloseButton?, disableOutsideClick?, width?, titleIcon? }` | Same + `subTitle?`, `footer?`, `showOverlay?` |

**Note:** Only `DialogWrapper` and `DialogFooter` are imported in the codebase. `DialogWrapper` is fully backward-compatible. `DialogFooter` narrows from all div props to `Pick<'id' \| 'className' \| 'style' \| 'children'>` — verify no other div props are passed.

---

### 5. `@signozhq/toggle-group` (v0.0.3 → UI v0.0.5) — 8 files

Completely rewritten — standalone wraps Radix with CVA; UI defines a custom discriminated-union API.

#### Deleted exports
| Export | Notes |
|---|---|
| (none removed by name — `ToggleGroup` and `ToggleGroupItem` still exist) | |

#### Deleted props on `ToggleGroup`
| Prop | Old Source | Notes |
|---|---|---|
| `variant` | CVA: `"default" \| "outline"` | Use `color` instead |
| `size` | CVA: `"default" \| "sm" \| "lg"` | Still exists but values may differ |
| All Radix `ToggleGroupPrimitive.Root` props | passthrough | Narrowed to explicit props |

#### Deleted props on `ToggleGroupItem`
| Prop | Old Source | Notes |
|---|---|---|
| `variant` | CVA | Removed |
| `size` | CVA | Removed |
| All Radix `ToggleGroupPrimitive.Item` props | passthrough | Narrowed |

#### Added exports
| Export | Type | Notes |
|---|---|---|
| `ToggleGroupSimple` | component | Convenience preset |
| `ToggleGroupSimpleItem` | type | Item shape for simple variant |
| `ToggleGroupSimpleProps` | type | Props for simple variant |
| `ToggleColor` | type (re-exported from toggle) | Color options |
| `ToggleColorValue` | value (re-exported from toggle) | Color value constant |
| `ToggleGroupProps` | type | Discriminated union |
| `ToggleGroupItemProps` | type | Explicit item props |

#### Added props on `ToggleGroup`
| Prop | Type | Notes |
|---|---|---|
| `type` | `'single' \| 'multiple'` | **Required** discriminant |
| `onChange` | `(value: string) => void` or `(value: string[]) => void` | Depends on `type` |
| `color` | `ToggleColor` | Replaces CVA `variant` |
| `disabled` | `boolean` | Explicit |
| `rovingFocus` | `boolean` | Explicit |
| `loop` | `boolean` | Explicit |
| `orientation` | `'horizontal' \| 'vertical'` | Explicit |
| `dir` | `'ltr' \| 'rtl'` | Explicit |
| `testId` | `string` | New |

#### Added props on `ToggleGroupItem`
| Prop | Type | Notes |
|---|---|---|
| `value` | `string` | **Required** |
| `testId` | `string` | New |

#### Changed interfaces
| Component | Standalone | `@signozhq/ui` |
|---|---|---|
| `ToggleGroup` | `React.ComponentProps<typeof ToggleGroupPrimitive.Root> & VariantProps<typeof toggleVariants>` (plain function) | `ToggleGroupProps` discriminated union (forwardRef) |
| `ToggleGroupItem` | `React.ComponentProps<typeof ToggleGroupPrimitive.Item> & VariantProps<typeof toggleVariants>` (plain function) | `{ value: string, testId? } & Pick<button, 'className' \| 'id' \| 'disabled' \| 'aria-disabled' \| 'children' \| 'onClick'>` (forwardRef) |

---

### 6. `@signozhq/checkbox` (v0.0.4 → UI v0.0.5) — 6 files

#### Deleted props
| Prop | Old Type | Notes |
|---|---|---|
| `checked` | Radix `CheckedState` | Use `value` instead |
| `onCheckedChange` | Radix `(checked: CheckedState) => void` | Use `onChange` instead |
| `labelName` | `string \| React.ReactNode` (on wrapper FC) | Use `children` instead |
| `defaultChecked` | Radix | Use `defaultValue` instead |
| All other Radix `CheckboxPrimitive.Root` props | passthrough | Narrowed |

#### Added exports
| Export | Type | Notes |
|---|---|---|
| `CheckboxProps` | interface | Exported (was not from standalone) |
| `CheckboxColors` | const | `Record<Capitalize<CheckboxColor>, CheckboxColor>` |

#### Added props
| Prop | Type | Notes |
|---|---|---|
| `value` | `CheckedState` | Replaces `checked` |
| `defaultValue` | `CheckedState` | Replaces `defaultChecked` |
| `onChange` | `(checked: CheckedState) => void` | Replaces `onCheckedChange` |
| `name` | `string` | Explicit |
| `required` | `boolean` | Explicit |
| `testId` | `string` | New |

#### Changed interfaces
| Item | Standalone | `@signozhq/ui` |
|---|---|---|
| `CheckboxProps` base | `extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & { color? }` | `Pick<button, 'id' \| 'disabled' \| 'className' \| 'children' \| 'onClick'> & { name?, color?, value?, defaultValue?, required?, testId?, onChange? }` |
| `CheckboxColor` | `'robin' \| 'forest' \| 'amber' \| 'sienna' \| 'cherry' \| 'sakura' \| 'aqua'` (7 values) | Same 7 + `'primary' \| 'success' \| 'warning' \| 'error'` (11 values) |
| Wrapper FC | `React.FC<{ labelName? } & CheckboxProps>` | `React.FC<CheckboxProps>` (`children` replaces `labelName`) |

#### Migration map
```
checked          →  value
defaultChecked   →  defaultValue
onCheckedChange  →  onChange
labelName        →  children
```

---

### 7. `@signozhq/drawer` (v0.0.6 → UI v0.0.5) — 2 files

Completely rewritten: standalone uses **vaul** (drawer-specific lib); UI wraps **Radix Dialog** primitives.

#### Deleted exports
| Export | Notes |
|---|---|
| (none by name) | All names preserved, but types completely different |

#### Deleted props on `DrawerWrapper`
| Prop | Old Type | Notes |
|---|---|---|
| `header` | `{ title: string; description?: string }` | Use `title` + `subTitle` instead |
| `content` | `React.ReactNode` | Use `children` instead |
| `allowOutsideClick` | `boolean` | Use `disableOutsideClick` instead (inverted) |
| `type` | `'panel' \| 'drawer'` | Removed, no replacement |

#### Deleted props on `DrawerContent`
| Prop | Old Type | Notes |
|---|---|---|
| `type` | `'panel' \| 'drawer'` | Removed |
| All vaul `Drawer.Content` props | passthrough | Replaced with Dialog-based props |

#### Added exports
| Export | Type | Notes |
|---|---|---|
| `ConfirmDrawer` | component | Confirm dialog in drawer form |
| `ConfirmDrawerUrl` | component | URL-driven confirm drawer |
| `DrawerCloseButton` | component | Standalone close button |
| `DrawerSubtitle` | component | Subtitle element |
| All named prop types | types | `DrawerProps`, `DrawerContentProps`, `DrawerWrapperProps`, etc. |
| `DrawerDirection` | type | `'top' \| 'right' \| 'bottom' \| 'left'` |

#### Added props on `DrawerWrapper`
| Prop | Type | Notes |
|---|---|---|
| `title` | `string` | Replaces `header.title` |
| `subTitle` | `string` | Replaces `header.description` |
| `children` | `React.ReactNode` | Replaces `content` |
| `disableOutsideClick` | `boolean` | Replaces `allowOutsideClick` (inverted) |
| `footer` | `React.ReactNode` | New |

#### Changed interfaces
| Component | Standalone | `@signozhq/ui` |
|---|---|---|
| `Drawer` | `React.ComponentProps<typeof Drawer$1.Root>` (vaul) | `DialogProps` (`{ children?, open?, defaultOpen?, onOpenChange?, modal? }`) |
| `DrawerContent` | `React.ComponentProps<typeof Drawer$1.Content> & { showOverlay?, type? }` | `Omit<DialogContentProps, 'position' \| 'heightMode'> & { direction?, showOverlay? }` |
| `DrawerTrigger` | `React.ComponentProps<typeof Drawer$1.Trigger>` | `DialogTriggerProps` |
| `DrawerClose` | `React.ComponentProps<typeof Drawer$1.Close>` | `DialogCloseProps` |
| `DrawerOverlay` | `React.ComponentProps<typeof Drawer$1.Overlay>` | `DialogOverlayProps` |
| `DrawerHeader`/`Footer` | `React.ComponentProps<'div'>` | `DialogHeaderProps`/`DialogFooterProps` |
| `DrawerTitle` | `React.ComponentProps<typeof Drawer$1.Title>` | `DialogTitleProps` |
| `DrawerDescription` | `React.ComponentProps<typeof Drawer$1.Description>` | `DialogDescriptionProps` |
| `DrawerPortal` | `React.ComponentProps<typeof Drawer$1.Portal>` | `DialogPortalProps` |
| `DrawerWrapper` | `{ trigger?, header: {title, description?}, content, footer?, direction?, showCloseButton?, allowOutsideClick?, showOverlay?, className?, type?, open?, onOpenChange? }` | `{ title?, subTitle?, children, open?, onOpenChange?, trigger?, footer?, className?, disableOutsideClick?, showCloseButton?, direction?, showOverlay? }` |

#### Migration map
```
header.title       →  title
header.description →  subTitle
content            →  children
allowOutsideClick  →  disableOutsideClick  (inverted: true↔false)
type               →  (removed)
```

---

### 8. `@signozhq/radio-group` (v0.0.4 → UI v0.0.5) — 2 files

#### Deleted props on `RadioGroup`
| Prop | Old Source | Notes |
|---|---|---|
| `onValueChange` | Radix | Use `onChange` instead |
| All Radix `RadioGroupProps` passthrough | Radix | Narrowed to explicit props |

#### Deleted props on `RadioGroupItem`
| Prop | Old Type | Notes |
|---|---|---|
| `color` | `RadioColorProps` | Moved to `RadioGroup` level |
| All Radix `RadioGroupPrimitive.Item` passthrough | Radix | Narrowed |

#### Added exports
| Export | Type | Notes |
|---|---|---|
| `RadioGroupProps` | type | New (was not exported) |
| `RadioGroupItemProps` | type | New (was `interface`, now `type`) |
| `RadioGroupLabelProps` | type | New (was not exported) |

#### Added props on `RadioGroup`
| Prop | Type | Notes |
|---|---|---|
| `onChange` | `(value: string) => void` | Replaces `onValueChange` |
| `color` | `RadioColorProps` | Moved from item |
| `name` | `string` | Explicit |
| `required` | `boolean` | Explicit |
| `disabled` | `boolean` | Explicit |
| `dir` | `'ltr' \| 'rtl'` | Explicit |
| `orientation` | `React.AriaAttributes['aria-orientation']` | Explicit |
| `loop` | `boolean` | Explicit |
| `testId` | `string` | New |

#### Added props on `RadioGroupItem`
| Prop | Type | Notes |
|---|---|---|
| `value` | `string` | **Required** (was inherited from Radix) |
| `required` | `boolean` | Explicit |
| `disabled` | `boolean` | Explicit |
| `testId` | `string` | New |
| `onCheck` | `() => void` | New |

#### Changed interfaces
| Component | Standalone | `@signozhq/ui` |
|---|---|---|
| `RadioGroup` | `Omit<RadioGroupPrimitive.RadioGroupProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>` | `Pick<div, 'id' \| 'className' \| 'children'> & { name?, required?, disabled?, dir?, orientation?, loop?, defaultValue?, value?, onChange?, testId?, color? }` |
| `RadioGroupItem` | `React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> & { color?: RadioColorProps }` | `Pick<button, 'id' \| 'className' \| 'children'> & { value (required), required?, disabled?, testId?, onCheck? }` |
| `RadioGroupLabel` | `React.LabelHTMLAttributes<HTMLLabelElement>` | `Pick<label, 'id' \| 'className' \| 'children' \| 'htmlFor'>` |

#### Migration map
```
RadioGroup.onValueChange  →  RadioGroup.onChange
RadioGroupItem.color      →  RadioGroup.color  (moved to parent)
```

---

### 9. `@signozhq/resizable` (v0.0.2 → UI v0.0.5) — 2 files

Different version of `react-resizable-panels` underneath.

#### Deleted props on `ResizablePanelGroup`
| Prop | Notes |
|---|---|
| `direction` | From react-resizable-panels passthrough; use `orientation` instead |
| All other passthrough props | Narrowed to explicit props |

#### Deleted props on `ResizablePanel`
| Prop | Old Type | Notes |
|---|---|---|
| `onCollapse` | `PanelOnCollapse` | Removed |
| `onExpand` | `PanelOnExpand` | Removed |
| `order` | `number` | Removed |
| `tagName` | `keyof HTMLElementTagNameMap` | Removed |

#### Added exports
| Export | Type | Notes |
|---|---|---|
| `useDefaultLayout` | hook | From react-resizable-panels v3+ |
| `useGroupRef` | hook | |
| `usePanelRef` | hook | |
| `useGroupCallbackRef` | hook | |
| `usePanelCallbackRef` | hook | |
| `ResizablePanelGroupProps` | type | |
| `ResizablePanelProps` | type | |
| `ResizableHandleProps` | type | |
| `Layout` | type | |
| `PanelSize` | type | |
| `GroupImperativeHandle` | type | |
| `PanelImperativeHandle` | type | |
| `OnGroupLayoutChange` | type | |
| `LayoutStorage` | type | |

#### Added props on `ResizablePanelGroup`
| Prop | Type | Notes |
|---|---|---|
| `orientation` | `'horizontal' \| 'vertical'` | Replaces `direction` |
| `defaultLayout` | `Layout` | New |
| `onLayoutChange` | `(layout: Layout) => void` | New |
| `onLayoutChanged` | `(layout: Layout) => void` | New |
| `disableCursor` | `boolean` | New |
| `disabled` | `boolean` | New |
| `groupRef` | `Ref<GroupImperativeHandle \| null>` | New |
| `resizeTargetMinimumSize` | `{ coarse: number; fine: number }` | New |
| `style` | `CSSProperties` | New |
| `testId` | `string` | New |

#### Added props on `ResizablePanel`
| Prop | Type | Notes |
|---|---|---|
| `disabled` | `boolean` | New |
| `groupResizeBehavior` | `'preserve-relative-size' \| 'preserve-pixel-size'` | New |
| `panelRef` | `Ref<PanelImperativeHandle \| null>` | New |
| `style` | `CSSProperties` | New |
| `testId` | `string` | New |

#### Added props on `ResizableHandle`
| Prop | Type | Notes |
|---|---|---|
| `disabled` | `boolean` | New |
| `style` | `CSSProperties` | New |
| `testId` | `string` | New |
| `children` | `React.ReactNode` | New |

#### Changed interfaces
| Component | Standalone | `@signozhq/ui` |
|---|---|---|
| `ResizablePanelGroup` | `React.ComponentProps<typeof ResizablePrimitive.PanelGroup>` (plain function) | Custom `ResizablePanelGroupProps` (forwardRef to HTMLDivElement) |
| `ResizablePanel.defaultSize` / `minSize` / `maxSize` / `collapsedSize` | `number \| undefined` | `number \| string \| undefined` (accepts `"25%"`, `"200px"`) |
| `ResizablePanel.onResize` | `PanelOnResize` (old signature) | `(panelSize: PanelSize, id: string \| number \| undefined, prevPanelSize: PanelSize \| undefined) => void` |
| `ResizableHandle` | `React.ComponentProps<typeof PanelResizeHandle> & { withHandle? }` (plain function) | Custom `ResizableHandleProps` (forwardRef to HTMLDivElement) |

---

### 10. `@signozhq/command` (v0.0.2 → UI v0.0.5) — 1 file

#### Deleted exports
None.

#### Added exports
| Export | Type | Notes |
|---|---|---|
| `CommandLoading` | component | New component (not in standalone) |
| All named prop types | types | `CommandProps`, `CommandDialogProps`, `CommandInputProps`, `CommandListProps`, `CommandEmptyProps`, `CommandLoadingProps`, `CommandGroupProps`, `CommandSeparatorProps`, `CommandItemProps`, `CommandShortcutProps` |

#### Changed interfaces
| Component | Standalone | `@signozhq/ui` |
|---|---|---|
| `CommandItem` | Radix cmdk passthrough (includes cmdk's `prefix`/`suffix`) | `Omit<cmdk.Item, 'prefix' \| 'suffix'> & { prefix?: React.ReactNode \| null; suffix?: React.ReactNode \| null }` |

The cmdk `prefix`/`suffix` are retyped to `React.ReactNode | null`. This is a subtle change — if existing code passes these props, check the type is compatible.

---

### 11. `@signozhq/combobox` (v0.0.4 → UI v0.0.5) — 1 file

#### Deleted exports
| Export | Notes |
|---|---|
| `ComboboxLabel` | Removed entirely — no replacement in UI |

#### Deleted props
| Component | Prop | Notes |
|---|---|---|
| `ComboboxItem` | `showCheck` | Removed |

#### Added exports
| Export | Type | Notes |
|---|---|---|
| `ComboboxSimple` | component | Convenience preset |
| `ComboboxSimpleItem` | type | |
| `ComboboxSimpleGroup` | type | |
| `ComboboxSimpleProps` | type | |
| All named prop types | types | `ComboboxTriggerProps`, `ComboboxCommandProps`, etc. |

#### Changed interfaces
| Component | Standalone | `@signozhq/ui` |
|---|---|---|
| `ComboboxTrigger.placeholder` | `string` | `React.ReactNode` (broadened) |
| `ComboboxTrigger.value` | `string` | `React.ReactNode` (broadened) |
| `ComboboxCommand.filter` | `(value: string, search: string) => number` (2 args) | `(value: string, search: string, keywords?: string[]) => number` (3 args) |
| `ComboboxItem` | `cmdk.Item & { isSelected?, showCheck? }` | `CommandItemProps & { isSelected? }` (gains `prefix`/`suffix`, loses `showCheck`) |

---

### 12. `@signozhq/calendar` (v0.1.1 → UI v0.0.5) — 1 file

#### Deleted props
| Component | Prop | Notes |
|---|---|---|
| `Calendar` | `buttonVariant` | Removed |

#### Added exports
| Export | Type | Notes |
|---|---|---|
| `CalendarProps` | type | New |
| `CalendarDayButtonProps` | type | New |

#### Changed interfaces
| Component | Standalone | `@signozhq/ui` |
|---|---|---|
| `Calendar` | `React.ComponentProps<typeof DayPicker> & { buttonVariant? }` | `React.ComponentProps<Exclude<typeof DayPicker, 'color'>>` |
| `CalendarDayButton` | `React.ComponentProps<typeof DayButton>` | `React.ComponentProps<Exclude<typeof DayButton, 'color' \| 'suffix' \| 'prefix'>> & { color?: ButtonColorValue; suffix?: string; prefix?: string }` |

---

### 13. `@signozhq/popover` (v0.1.2 → UI v0.0.5) — 1 file

**Identical.** Both export `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor` with the same Radix passthrough types. The UI version adds an `@experimental` JSDoc annotation but no API changes.

No deletions. No additions. No migrations needed.

---

### 14. `@signozhq/table` (v0.3.7 → UI v0.0.5) — 1 file

**Fully backward-compatible.** All existing exports preserved.

#### Added props on `DataTable`
| Prop | Type | Notes |
|---|---|---|
| `initialColumnOrder` | `string[]` | New |
| `testId` | `string` | New |

#### Added exports
| Export | Type | Notes |
|---|---|---|
| `TableProps` | type | Was internal, now exported |
| `TablePreferences` | interface | Persistence utilities |
| `getTablePreferences` | function | |
| `saveTablePreferences` | function | |
| `resetTablePreferences` | function | |

No deletions. No migrations needed.

---

## Migration Priority

### Phase 1 — Safe drop-in (3 packages, 3 files)
Just change import source. No prop changes required.

| Package | File |
|---|---|
| `@signozhq/popover` | `TanStackHeaderRow.tsx` |
| `@signozhq/table` | `ColumnView.tsx` |
| `@signozhq/command` | `cmdKPalette.tsx` (verify `CommandItem` prop compat) |

### Phase 2 — Low effort, backward-compatible presets (2 packages, 10 files)
`DialogWrapper`/`DialogFooter` are backward-compatible. Just verify no extra div props are passed to `DialogFooter`.

| Package | Files |
|---|---|
| `@signozhq/dialog` | 9 files (all use `DialogWrapper`/`DialogFooter` only) |
| `@signozhq/calendar` | 1 file (verify `buttonVariant` not used) |

### Phase 3 — Medium effort, prop renames (4 packages, 43 files)
Systematic find-and-replace of renamed props per file.

| Package | Files | Primary changes |
|---|---|---|
| `@signozhq/callout` | 11 | `message`→`title`, `description`→`children`, `dismissable`→`action` |
| `@signozhq/input` | 24 | Remove `theme` usage, resolve `inputVariants` (1 file) |
| `@signozhq/checkbox` | 6 | `checked`→`value`, `onCheckedChange`→`onChange`, `labelName`→`children` |
| `@signozhq/radio-group` | 2 | `onValueChange`→`onChange`, move `color` to group |

### Phase 4 — High effort, significant rework (5 packages, 53 files)
API redesigns requiring per-file audit.

| Package | Files | Primary changes |
|---|---|---|
| `@signozhq/button` | 40 | `prefixIcon`→`prefix`, `suffixIcon`→`suffix`, remove `width`, remove `size="xs"`/`size="lg"`, audit HTML attr usage |
| `@signozhq/toggle-group` | 8 | Add `type` discriminant, `variant`→`color`, wire up `onChange` |
| `@signozhq/drawer` | 2 | Restructure `DrawerWrapper` props entirely |
| `@signozhq/resizable` | 2 | `direction`→`orientation`, update callbacks, handle size type changes |
| `@signozhq/combobox` | 1 | Remove `showCheck`, handle trigger type broadening |

---

## Verification

```bash
# Ensure no remaining imports from old packages
grep -rE "from '@signozhq/(button|callout|calendar|checkbox|combobox|command|dialog|drawer|input|popover|radio-group|resizable|table|toggle-group)'" src/

# Type check
yarn tsc --noEmit

# Run tests
yarn test
```

---

## Affected Files (by package)

### `@signozhq/button` (40 files)

- `src/components/AuthPageContainer/AuthHeader.tsx`
- `src/components/CreateServiceAccountModal/CreateServiceAccountModal.tsx`
- `src/components/CustomTimePicker/CustomTimePicker.tsx`
- `src/components/EditMemberDrawer/DeleteMemberDialog.tsx`
- `src/components/EditMemberDrawer/EditMemberDrawer.tsx`
- `src/components/EditMemberDrawer/ResetLinkDialog.tsx`
- `src/components/InviteMembersModal/InviteMembersModal.tsx`
- `src/components/ServiceAccountDrawer/AddKeyModal/KeyCreatedPhase.tsx`
- `src/components/ServiceAccountDrawer/AddKeyModal/KeyFormPhase.tsx`
- `src/components/ServiceAccountDrawer/DeleteAccountModal.tsx`
- `src/components/ServiceAccountDrawer/EditKeyModal/EditKeyForm.tsx`
- `src/components/ServiceAccountDrawer/KeysTab.tsx`
- `src/components/ServiceAccountDrawer/RevokeKeyModal.tsx`
- `src/components/ServiceAccountDrawer/SaveErrorItem.tsx`
- `src/components/ServiceAccountDrawer/ServiceAccountDrawer.tsx`
- `src/container/CustomDomainSettings/CustomDomainEditModal.tsx`
- `src/container/CustomDomainSettings/CustomDomainSettings.tsx`
- `src/container/ForgotPassword/SuccessScreen.tsx`
- `src/container/ForgotPassword/index.tsx`
- `src/container/GeneralSettings/GeneralSettings.tsx`
- `src/container/GeneralSettings/LicenseKeyRow/LicenseKeyRow.tsx`
- `src/container/Home/DataSourceInfo/DataSourceInfo.tsx`
- `src/container/MembersSettings/MembersSettings.tsx`
- `src/container/MySettings/LicenseSection/LicenseSection.tsx`
- `src/container/OnboardingQuestionaire/AboutSigNozQuestions/AboutSigNozQuestions.tsx`
- `src/container/OnboardingQuestionaire/InviteTeamMembers/InviteTeamMembers.tsx`
- `src/container/OnboardingQuestionaire/OptimiseSignozNeeds/OptimiseSignozNeeds.tsx`
- `src/container/OnboardingQuestionaire/OrgQuestions/OrgQuestions.tsx`
- `src/container/OrganizationSettings/AuthDomain/CreateEdit/CreateEdit.tsx`
- `src/container/OrganizationSettings/AuthDomain/CreateEdit/Providers/components/DomainMappingList.tsx`
- `src/container/OrganizationSettings/AuthDomain/CreateEdit/Providers/components/RoleMappingSection.tsx`
- `src/container/OrganizationSettings/AuthDomain/index.tsx`
- `src/container/ResetPassword/index.tsx`
- `src/container/RolesSettings/PermissionSidePanel/PermissionSidePanel.tsx`
- `src/container/RolesSettings/RoleDetails/RoleDetailsPage.tsx`
- `src/container/RolesSettings/RolesComponents/CreateRoleModal.tsx`
- `src/container/RolesSettings/RolesComponents/DeleteRoleModal.tsx`
- `src/container/RolesSettings/RolesSettings.tsx`
- `src/container/ServiceAccountsSettings/ServiceAccountsSettings.tsx`
- `src/container/SpanDetailsDrawer/SpanLogs/SpanLogs.tsx`
- `src/pages/SignUp/SignUp.tsx`

### `@signozhq/input` (24 files)

- `src/components/CreateServiceAccountModal/CreateServiceAccountModal.tsx`
- `src/components/EditMemberDrawer/EditMemberDrawer.tsx`
- `src/components/InviteMembersModal/InviteMembersModal.tsx`
- `src/components/ServiceAccountDrawer/AddKeyModal/KeyFormPhase.tsx`
- `src/components/ServiceAccountDrawer/EditKeyModal/EditKeyForm.tsx`
- `src/components/ServiceAccountDrawer/OverviewTab.tsx`
- `src/container/CustomDomainSettings/CustomDomainEditModal.tsx`
- `src/container/ForgotPassword/index.tsx`
- `src/container/GeneralSettings/Retention.tsx`
- `src/container/MembersSettings/MembersSettings.tsx`
- `src/container/OnboardingQuestionaire/AboutSigNozQuestions/AboutSigNozQuestions.tsx`
- `src/container/OnboardingQuestionaire/InviteTeamMembers/InviteTeamMembers.tsx`
- `src/container/OnboardingQuestionaire/OrgQuestions/OrgQuestions.tsx`
- `src/container/OrganizationSettings/AuthDomain/CreateEdit/Providers/AuthnGoogleAuth.tsx`
- `src/container/OrganizationSettings/AuthDomain/CreateEdit/Providers/AuthnOIDC.tsx`
- `src/container/OrganizationSettings/AuthDomain/CreateEdit/Providers/AuthnSAML.tsx`
- `src/container/OrganizationSettings/AuthDomain/CreateEdit/Providers/components/AttributeMappingSection.tsx`
- `src/container/OrganizationSettings/AuthDomain/CreateEdit/Providers/components/ClaimMappingSection.tsx`
- `src/container/OrganizationSettings/AuthDomain/CreateEdit/Providers/components/DomainMappingList.tsx`
- `src/container/OrganizationSettings/AuthDomain/CreateEdit/Providers/components/RoleMappingSection.tsx`
- `src/container/RolesSettings/RolesComponents/CreateRoleModal.tsx`
- `src/container/RolesSettings/RolesSettings.tsx`
- `src/container/ServiceAccountsSettings/ServiceAccountsSettings.tsx`
- `src/pages/SignUp/SignUp.tsx`

### `@signozhq/callout` (11 files)

- `src/components/InviteMembersModal/InviteMembersModal.tsx`
- `src/components/ServiceAccountDrawer/AddKeyModal/KeyCreatedPhase.tsx`
- `src/container/CustomDomainSettings/CustomDomainSettings.tsx`
- `src/container/GeneralSettings/LicenseKeyRow/LicenseRowDismissibleCallout/LicenseRowDismissibleCallout.tsx`
- `src/container/OnboardingQuestionaire/InviteTeamMembers/InviteTeamMembers.tsx`
- `src/container/OrganizationSettings/AuthDomain/CreateEdit/Providers/AuthnGoogleAuth.tsx`
- `src/container/OrganizationSettings/AuthDomain/CreateEdit/Providers/AuthnOIDC.tsx`
- `src/container/OrganizationSettings/AuthDomain/CreateEdit/Providers/AuthnSAML.tsx`
- `src/container/ResetPassword/index.tsx`
- `src/container/RolesSettings/RoleDetails/components/OverviewTab.tsx`
- `src/pages/SignUp/SignUp.tsx`

### `@signozhq/dialog` (9 files)

- `src/components/CreateServiceAccountModal/CreateServiceAccountModal.tsx`
- `src/components/EditMemberDrawer/DeleteMemberDialog.tsx`
- `src/components/EditMemberDrawer/ResetLinkDialog.tsx`
- `src/components/InviteMembersModal/InviteMembersModal.tsx`
- `src/components/ServiceAccountDrawer/AddKeyModal/index.tsx`
- `src/components/ServiceAccountDrawer/DeleteAccountModal.tsx`
- `src/components/ServiceAccountDrawer/EditKeyModal/index.tsx`
- `src/components/ServiceAccountDrawer/RevokeKeyModal.tsx`
- `src/container/CustomDomainSettings/CustomDomainEditModal.tsx`

### `@signozhq/toggle-group` (8 files)

- `src/components/ServiceAccountDrawer/AddKeyModal/KeyFormPhase.tsx`
- `src/components/ServiceAccountDrawer/EditKeyModal/EditKeyForm.tsx`
- `src/components/ServiceAccountDrawer/ServiceAccountDrawer.tsx`
- `src/container/NewWidget/RightContainer/components/DisconnectValuesSelector/DisconnectValuesModeToggle.tsx`
- `src/container/NewWidget/RightContainer/components/FillModeSelector/FillModeSelector.tsx`
- `src/container/NewWidget/RightContainer/components/LineInterpolationSelector/LineInterpolationSelector.tsx`
- `src/container/NewWidget/RightContainer/components/LineStyleSelector/LineStyleSelector.tsx`
- `src/container/RolesSettings/RoleDetails/RoleDetailsPage.tsx`

### `@signozhq/checkbox` (6 files)

- `src/container/DashboardContainer/DashboardSettings/PublicDashboard/index.tsx`
- `src/container/OnboardingQuestionaire/AboutSigNozQuestions/AboutSigNozQuestions.tsx`
- `src/container/OrganizationSettings/AuthDomain/CreateEdit/Providers/AuthnGoogleAuth.tsx`
- `src/container/OrganizationSettings/AuthDomain/CreateEdit/Providers/AuthnOIDC.tsx`
- `src/container/OrganizationSettings/AuthDomain/CreateEdit/Providers/AuthnSAML.tsx`
- `src/container/OrganizationSettings/AuthDomain/CreateEdit/Providers/components/RoleMappingSection.tsx`

### `@signozhq/drawer` (2 files)

- `src/components/EditMemberDrawer/EditMemberDrawer.tsx`
- `src/components/ServiceAccountDrawer/ServiceAccountDrawer.tsx`

### `@signozhq/radio-group` (2 files)

- `src/container/OnboardingQuestionaire/OrgQuestions/OrgQuestions.tsx`
- `src/container/RolesSettings/PermissionSidePanel/PermissionSidePanel.tsx`

### `@signozhq/resizable` (2 files)

- `src/container/NewWidget/index.tsx`
- `src/pages/TraceDetailV2/TraceDetailV2.tsx`

### `@signozhq/command` (1 file)

- `src/components/cmdKPalette/cmdKPalette.tsx`

### `@signozhq/combobox` (1 file)

- `src/components/QuickFilters/QuickFilters.tsx`

### `@signozhq/calendar` (1 file)

- `src/components/CustomTimePicker/CalendarContainer.tsx`

### `@signozhq/popover` (1 file)

- `src/container/LogsExplorerList/TanStackTableView/TanStackHeaderRow.tsx`

### `@signozhq/table` (1 file)

- `src/container/LogsExplorerList/ColumnView/ColumnView.tsx`
