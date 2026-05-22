# chore(frontend): migrate plain antd `Input` to `@signozhq/ui/input`

## Summary

Migrates the plain antd `<Input>` from `antd` → `@signozhq/ui/input` across the frontend, as part of the broader move to the SigNoz design-system primitives.

- **51 files migrated** — only the import was rewritten; no JSX call sites changed. The `value` / `onChange` / `placeholder` / `disabled` / `type` / `prefix` / `suffix` contract is identical between the two libraries for everything in scope.
- **4 files attempted then reverted** — kept on antd with a `TODO(@signozhq/ui-input)` comment because `@signozhq/ui` Input doesn't yet expose the props they need:
  - `MetricsExplorer/Inspect/MetricTimeAggregation.tsx` — needs `onWheel` (blur-on-scroll for number inputs)
  - `NewWidget/RightContainer/ContextLinks/UpdateContextLinks.tsx` — needs `spellCheck`
  - `PipelinePage/.../AddNewProcessor/FormFields/CSVInput.tsx` — spreads antd `InputProps` (`size: SizeType` clashes with `@signozhq/ui` numeric `size`)
  - `Trace/Filters/Panel/PanelBody/Duration/styles.ts` — `styled(Input)` consumed with `addonAfter="ms"`

## Out of scope (still on antd)

By design, this PR does **not** touch:

- `Input.TextArea` / `Input.Password` / `Input.Search` / `Input.Group`
- `InputNumber`
- `<Input>` instances using `addonBefore` / `addonAfter` / `allowClear` / `bordered` / `status` / `size="small|middle|large"`
- Typed `InputRef`

A breakdown of the 61 remaining antd `Input` files (grouped by which unsupported prop blocks them) is in `INPUT_MIGRATION_AFFECTED.md`.

## Test plan

Per-route smoke check — for each input below confirm: typing works, controlled value updates, placeholder shows, disabled state still disables, and `Form.Item` validation still surfaces errors.

- [ ] **Alerts → New alert** (`/alerts/new`) — threshold name/value, evaluation window, advanced options, time input, notification interval
- [ ] **Channels → New channel** (`/settings/channels/new`) — Email "to", Webhook URL/user/pass, channel name
- [ ] **Dashboards** — `/dashboard` list + Request/Templates modals; in `/dashboard/:id` edit name, chart manager, section rename; in widget editor, column config
- [ ] **Logs Explorer** (`/logs/logs-explorer`) — sidebar filter search, log details Overview tab, quick-filter search
- [ ] **Logs Pipelines** (`/logs/pipelines`) — add pipeline name, add processor (JSON flattening + CSV branches)
- [ ] **Traces Explorer** (`/traces-explorer`) — span drawer Attributes + Events search; legacy `/trace` tag-key + graph filter
- [ ] **Trace details V3** (`/trace/:id`) — percentile panel, "Add span to funnel" modal
- [ ] **Funnels** (`/traces/funnels`) — search bar, rename funnel
- [ ] **Saved Views** (`/logs/saved-views`, `/traces/saved-views`) — rename + "Save view as…" from explorer
- [ ] **Metrics Explorer** (`/metrics-explorer`) — metric details → Metadata
- [ ] **Integrations** — AWS Region form
- [ ] **Onboarding** (`/get-started`) — custom data source, env/app names
- [ ] **Org settings → Invite members** — email + name fields
- [ ] **Planned downtime / Licenses / Routing policies** — list-page search & forms
- [ ] **Custom time picker → Timezone search** (rendered globally; verify on dashboards + logs + traces headers)
- [ ] **Status page** (`/status` via `Version/styles.ts`) — visually re-verify the styled width

🤖 Generated with [Claude Code](https://claude.com/claude-code)
