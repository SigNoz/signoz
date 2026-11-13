# Popover migration analysis

The new `@signozhq/ui` Popover is click-only. This note maps the current app onto that API so a later migration does not break open state, focus, or the global `.ant-popover` overrides. It does not change any call site.

The component this describes lives in the design-system repo (`packages/ui/src/popover`). Storybook stories for it are `Playground`, `SaveViewForm`, `ControlledOpen`, `InsideDialog`, `MaxHeightScrolling`, and `AnchoredTypeahead`.

## The API to migrate onto

```tsx
<Popover
  nativeButton
  side="bottom"
  align="start"
  trigger={<button type="button">Open</button>}
  open={open}
  onOpenChange={setOpen}
>
  {content}
</Popover>
```

| Today | New Popover |
| --- | --- |
| antd `children` (the trigger) | `trigger` (required) |
| antd `content`, or Radix `<PopoverContent>` | `children` |
| antd `trigger="click"` | the only mode; there is no `openOn` |
| antd `trigger="hover"` | not this component; a Tooltip, or a click popover when the body is interactive |
| `placement="bottomRight"` | `side="bottom"` `align="end"` |
| `placement="bottomLeft"` | `side="bottom"` `align="start"` |
| `open` / `onOpenChange` | kept; `onOpenChange` receives Base UI's reason and `details.cancel()` |
| `defaultOpen` | removed; nothing in the app starts open |
| `overlayClassName`, `overlayStyle`, `overlayInnerStyle`, `className` | rejected on the shell; size is `width` / `maxWidth` / `maxHeight` |
| `getPopupContainer` | `container` |
| `destroyTooltipOnHide` | the only behavior; the popup unmounts on close |
| `arrow` / `showArrow` | rejected; the shell has no arrow |
| Radix `PopoverAnchor` | `anchor`, and the trigger is still required |
| Radix `withPortal={false}` | `container` (inside a Dialog the popup already portals into the panel) |
| Radix `onInteractOutside` | `onOpenChange` + `details.cancel()` when `reason === 'outside-press'` |
| `sideOffset` / `alignOffset` | not props; fixed at 4px and 0 |

`nativeButton` is required. `true` when `trigger` renders a `<button>` (including `Button`). `false` for anything else.

A node that renders nothing (`null`, `false`, `''`) renders the trigger alone, with no listeners and no portal.

## What is in the app today

Counted from `frontend/src` on this branch:

- **29 files** import `Popover` from `antd`.
- **7 files** import `Popover` from `@signozhq/ui` (the Radix wrapper this rework replaces). Those seven break as soon as the package ships, because `children` stops being the trigger.
- **18 SCSS files** override `.ant-popover*`.

antd `Dropdown` is already on `@signozhq/ui/dropdown`. antd `Tooltip` (on the order of 100 importers) is a separate migration.

### antd files

`src/components/CustomTimePicker/CustomTimePicker.tsx`
`src/components/DownloadOptionsMenu/DownloadOptionsMenu.tsx`
`src/components/ErrorPopover/ErrorPopover.tsx`
`src/components/ExplorerCard/ExplorerCard.tsx`
`src/components/HeaderRightSection/HeaderRightSection.tsx`
`src/components/Logs/AddToQueryHOC.tsx`
`src/components/LogsFormatOptionsMenu/LogsFormatOptionsMenu.tsx`
`src/components/QueryBuilderV2/QueryV2/QueryAggregation/QueryAggregationSelect.tsx`
`src/components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch.tsx`
`src/components/QueryBuilderV2/QueryV2/TraceOperator/TraceOperatorEditor.tsx`
`src/components/TableRenderer/LabelColumn.tsx`
`src/components/WarningPopover/WarningPopover.tsx`
`src/container/AlertHistory/AlertPopover/AlertPopover.tsx`
`src/container/CreateAlertV2/EvaluationSettings/EvaluationSettings.tsx`
`src/container/Home/Home.tsx`
`src/container/MetricsExplorer/MetricDetails/AllAttributes.tsx`
`src/container/MetricsExplorer/MetricDetails/AllAttributesValue.tsx`
`src/container/MetricsExplorer/Summary/MetricNameSearch.tsx`
`src/container/OptionsMenu/index.tsx`
`src/container/TopNav/AutoRefreshV2/index.tsx`
`src/pages/DashboardsListPage/components/ListHeader/ListHeader.tsx`
`src/pages/MetricsApplication/ApDex/ApDexApplication.tsx`
`src/pages/PublicDashboard/PublicDashboardView/PublicAutoRefresh/PublicAutoRefresh.tsx`
`src/pages/TraceDetailsV3/SpanDetailsPanel/Events/components/AttributeWithExpandablePopover.tsx`
`src/pages/TracesFunnelDetails/components/FunnelConfiguration/FunnelStepPopover.tsx`
`src/pages/TracesFunnels/components/FunnelsList/FunnelItemPopover.tsx`
`src/pages/TracesFunnels/components/SearchBar/SearchBar.tsx`
`src/periscope/components/ContextMenu/index.tsx`
`src/periscope/components/SeeMore/SeeMore.tsx`

### Existing `@signozhq/ui` popovers

`src/components/ExportMenu/ExportMenu.tsx`
`src/components/MarkdownEditor/MarkdownHelp.tsx`
`src/components/TanStackTableView/TanStackHeaderRow.tsx`
`src/container/AIAssistant/components/ChatInput/ChatInput.tsx`
`src/container/ListAlertRules/components/ColumnSelector.tsx`
`src/pages/DashboardPage/DashboardContainer/PanelEditor/ConfigPane/sections/ContextLinksSection/VariablesPopover.tsx`
`src/pages/DashboardsListPage/components/ViewsRail/ViewNamePopover.tsx`

### SCSS that overrides `.ant-popover`

`src/components/DownloadOptionsMenu/DownloadOptionsMenu.styles.scss`
`src/components/LogsFormatOptionsMenu/LogsFormatOptionsMenu.styles.scss`
`src/components/QueryBuilderV2/QueryV2/QueryAggregation/QueryAggregation.styles.scss`
`src/components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch.styles.scss`
`src/container/AlertHistory/AlertPopover/AlertPopover.styles.scss`
`src/container/AlertHistory/Statistics/TopContributorsCard/TopContributorsCard.styles.scss`
`src/container/CreateAlertV2/EvaluationSettings/styles.scss`
`src/container/Home/Home.styles.scss`
`src/container/MetricsExplorer/MetricDetails/MetricDetails.styles.scss`
`src/container/MetricsExplorer/Summary/Summary.styles.scss`
`src/container/TopNav/AutoRefreshV2/AutoRefreshV2.styles.scss`
`src/container/TopNav/DateTimeSelectionV2/DateTimeSelectionV2.styles.scss`
`src/container/WidgetCard/WidgetCard.styles.scss`
`src/pages/DashboardsListPage/components/ListHeader/ListHeader.module.scss`
`src/pages/TracesFunnels/TracesFunnels.styles.scss`
`src/pages/TracesFunnels/components/FunnelsList/FunnelsList.styles.scss`
`src/pages/TracesFunnels/components/SearchBar/SearchBar.styles.scss`
`src/periscope/components/ContextMenu/styles.scss`

Three of these are unscoped and restyle every antd popover on the page, not just their own:

- `src/container/MetricsExplorer/Summary/Summary.styles.scss`
- `src/container/CreateAlertV2/EvaluationSettings/styles.scss`
- `src/container/AlertHistory/Statistics/TopContributorsCard/TopContributorsCard.styles.scss`

Scope or delete those three before moving any nearby popover, or a migrated popup and a leftover antd popup will share rules that only one of them understands.

Most of the other files repeat one recipe: padding 0, 4px radius, a 1px border, a translucent background, the arrow hidden. The new shell already has zero padding, `--radius-2`, and no arrow. Per-site size (fixed widths around 187–500px, max-width 600px, max-height 254px) becomes `width` / `maxWidth` / `maxHeight`. Do not re-apply the recipe as a `className`; the component rejects it.

## What should not become this Popover

**Hover descriptions.** `AddToQueryHOC`, `LabelColumn`, the three Query Builder validation popovers, `SeeMore`, and `AttributeWithExpandablePopover` open on hover. Those are Tooltips. `AttributeWithExpandablePopover` shows a value the user copies; if Tooltip cannot hold that, make it a click popover instead of keeping hover.

**WarningPopover** (imported from about 10 files) is hover today and contains docs links. A tooltip cannot host those links. Either the links move out and the summary becomes a Tooltip, or the wrapper becomes a click Popover with `maxWidth` around 600.

**Menus.** Funnel item and funnel step action lists, the sort lists in `ListHeader` and Traces Funnels `SearchBar`, `AutoRefreshV2` / `PublicAutoRefresh` interval lists, and `AlertPopover`'s two links are rows that close when one is picked. Those are Dropdowns. `AllAttributes` per-row actions are the same shape.

**ContextMenu** (`src/periscope/components/ContextMenu/index.tsx`, imported across the dashboard drilldown) opens at chart-click coordinates. There is no trigger element. The new Popover requires `trigger`, so this stays a context menu. Do not fold the phantom span, `position: fixed` overlay, `zIndex: 10000`, or `calculatePopoverPosition.ts` into `anchor`. `anchor` is for a popover that already has a trigger and should position against something else (the typeahead input row).

**Inspect charts.** `MetricsExplorer/Inspect` `GraphPopover` and `HoverPopover` are absolutely positioned cards, not antd Popover. Leave them until there is a context-menu or anchor design that matches them.

**PanelStatusPopover** is a Tooltip despite the name.

## What should become this Popover

Click panels whose content is a form, a picker, or a composed layout:

- `CustomTimePicker` — the most visible one. Controlled `open`, `container` for `getPopupContainer`, and it already unmounts on hide. It opens from both input focus and click; that logic stays in the caller, with `onOpenChange`.
- `EvaluationSettings` / `EvaluationWindowPopover` — controlled, wide (`width` / `maxWidth`), and sitting on a global `.ant-popover` override. Migrate the override in the same change.
- `HeaderRightSection` — three controlled forms (feedback, announcements, share).
- `ExplorerCard` save-view form and `ViewNamePopover` — close only after the save succeeds, so `open` stays controlled. `ViewNamePopover` is already on the library and will not compile against the new props.
- `ApDex` threshold form.
- `Home` welcome checklist — drop the transparent-shell override; the shell is the component's.
- `OptionsMenu`, `DownloadOptionsMenu`, `LogsFormatOptionsMenu` — click panels. `LogsFormatOptionsMenu` nests a submenu; the inner popup must be portalled, and the outer `onOpenChange` must `cancel()` an outside press that lands in the inner popup.
- `MetricNameSearch` — controlled search panel. Scope the global padding override in `Summary.styles.scss` in the same change.
- `AllAttributesValue` — one popover open at a time in a list. That is controlled `open` keyed by row, which the API still allows.
- `ChatInput` context picker — already on the library; `side="top"` `align="end"` plus `width`.
- `VariablesPopover` — already on the library. Keep `anchor` on the input row, `initialFocus={false}` so the caret stays, and `details.cancel()` when the outside press is the anchor. `withPortal={false}` becomes the default dialog `container`, not an unportalled popup.
- `ColumnSelector`, `MarkdownHelp`, `TanStackHeaderRow`, `ExportMenu` — Radix `asChild` trigger plus content. The trigger moves to the `trigger` prop, content moves to `children`, and `className` on the shell becomes `width` / `maxWidth`.

`ErrorPopover` is a thin wrapper. Re-point it at the new props and its consumer follows.

## Order

Before any change: screenshot every current popover, in both themes, so each call site's pattern is on record and a component swap is reviewable against it. Flag the misusages to design as they turn up — links inside hover surfaces above all. Swapping the component during migration is expected where the old call site was on the wrong one; antd call sites stay untouched until their turn.

1. Scope the three global `.ant-popover` files so later migrations cannot restyle leftover antd popovers.
2. Move the seven existing `@signozhq/ui` call sites first. They break at the package bump; the 29 antd files do not, until each one is switched.
3. Migrate shared wrappers that are actually popovers (`ErrorPopover`, then `WarningPopover` once the links decision is made). Leave `ContextMenu` on antd until a context menu exists.
4. Migrate click forms (`CustomTimePicker`, evaluation window, header menus, save-view, ApDex).
5. Send hover descriptions to Tooltip and row menus to Dropdown, instead of forcing them through Popover.
6. Delete the matching `.ant-popover` rules in the same change as each call site, so a half-migrated page is not styled twice.

## Risks

- **Controlled `open` is load-bearing.** Save forms close from inside the popup only when the mutation succeeds. A list keeps one popover open at a time. Dropping `open` and driving everything from `onOpenChange` alone cannot express either. Keep the controlled prop at those sites.
- **Focus moves in.** Click popovers focus the first tabbable child. Typeaheads (`VariablesPopover`, and any filter that must keep the caret) need `initialFocus={false}`.
- **Outside press and anchors.** A press on the anchor looks outside. Call `details.cancel()` or the typeahead closes when the user clicks the input it is anchored to.
- **Dialogs.** Inside a Dialog or Drawer the popup portals into the panel so the focus trap can reach it. Do not set `container={document.body}` there.
- **Z-index.** The shell starts at `--popover-z-index` (50) and lifts above the layer its trigger sits in. A Tooltip inside a row must still paint above the popup. The app ladder today is tooltip 1070, dropdown 1050, popover 1030, modal 1000. Check a truncated row tooltip inside a popover after the first real migration.
- **Scroll locking.** Chart popovers measure the wrong box when a modal has locked scroll. This popover does not lock scroll (`modal` is rejected). Re-check Infrastructure Monitoring charts if a surrounding modal is open.
- **`nativeButton` mismatches.** Base UI logs an error when the flag does not match the element. Every non-button trigger (a badge, a custom row, an input) needs `nativeButton={false}`.

## `--popover-foreground` audit

The shell reads `--popover-background`, `--popover-foreground`, `--popover-border`, and `--popover-shadow`. Those semantic values belong to the token package, not to call sites.

Two legacy shadcn variables predate those hooks:

- `--popover-foreground` is the foreground hook the shell uses. It should stay pointed at the same foreground as the rest of the light and dark themes (`--l1-foreground` today).
- `--popover` (no suffix) is the old background. `--calendar-select-background` still reads it. Do not repoint `--popover` at `--popover-background` or at `surface-3` until the calendar token is audited, or date selection changes color with the popover shell.

Call sites that pass antd's `color` (a gradient string on `AlertPopover`, a raw token on `SeeMore`) do not map to a prop. The shell color comes from the tokens. Content that needs its own background paints it inside `children`.
