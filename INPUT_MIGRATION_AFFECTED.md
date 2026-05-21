# antd `Input` → `@signozhq/ui/input` Migration — Affected Files & Verification

## What changed

For each file listed below, the import was rewritten:

```diff
- import { Input, ...rest } from 'antd';
+ import { Input } from '@signozhq/ui/input';
+ import { ...rest } from 'antd';
```

Only the plain antd `<Input>` component was migrated. The following are **not** migrated and continue to use antd:

- `Input.TextArea` / `Input.Password` / `Input.Search` / `Input.Group`
- `InputNumber`
- `<Input>` with `addonBefore`, `addonAfter`, `allowClear`, `bordered`, `status="error"`, or `size="small|middle|large"` props
- `InputRef` (typed refs)

No JSX usages of `<Input>` were touched — only the import source was swapped. The component contract (`value`, `onChange`, `placeholder`, `disabled`, `type`, `prefix`, `suffix`, etc.) matches between the two libraries for the cases migrated here.

---

## Reverted after TypeScript errors — 4 files (kept on antd, marked with TODO)

These files were initially migrated, then reverted because `@signozhq/ui` `Input` does not expose the props they need. Each one carries a `TODO(@signozhq/ui-input)` comment above the antd import.

| File | Blocker |
|---|---|
| `frontend/src/container/MetricsExplorer/Inspect/MetricTimeAggregation.tsx` | Uses `onWheel` on `<Input type="number">` to blur on scroll. Not exposed on `@signozhq/ui/input`. |
| `frontend/src/container/NewWidget/RightContainer/ContextLinks/UpdateContextLinks.tsx` | URL `<Input>` uses `spellCheck="false"` (along with `autoCorrect`, `autoCapitalize`). `spellCheck` not exposed. |
| `frontend/src/container/PipelinePage/PipelineListsView/AddNewProcessor/FormFields/CSVInput.tsx` | Spreads antd `InputProps` (`{...otherProps}`) onto `<Input>`. `size: SizeType` clashes with `@signozhq/ui` Input's numeric `size`. |
| `frontend/src/container/Trace/Filters/Panel/PanelBody/Duration/styles.ts` | The `styled(Input)` wrapper is consumed in `Duration/index.tsx` with `addonAfter="ms"`. Not exposed. |

---

## Migrated files — 51 total

Grouped by the route/page that renders them. Visit each route after the migration and confirm the input still:

1. Renders with the expected layout/spacing
2. Accepts keyboard input and reflects controlled `value`
3. Fires `onChange` correctly (search filters, form submissions still work)
4. Shows placeholder text
5. Disables/enables as expected
6. Form validation (`Form.Item rules`) still shows errors

### Alerts — Create / Edit Alert (`/alerts/new`, `/alerts/edit`)

| File | Where the input shows up |
|---|---|
| `frontend/src/container/CreateAlertV2/AlertCondition/ThresholdItem.tsx` | Threshold name + threshold value + recovery threshold inputs in the Alert Condition card |
| `frontend/src/container/CreateAlertV2/EvaluationSettings/AdvancedOptions.tsx` | Advanced Options collapse inside Evaluation Settings |
| `frontend/src/container/CreateAlertV2/EvaluationSettings/EvaluationWindowPopover/EvaluationWindowDetails.tsx` | Evaluation Window popover (numeric value + unit) |
| `frontend/src/container/CreateAlertV2/EvaluationSettings/TimeInput/TimeInput.tsx` | HH:MM:SS time input shared in Evaluation Settings |
| `frontend/src/container/CreateAlertV2/NotificationSettings/NotificationSettings.tsx` | Re-notification interval input |

### Alert Channels (`/settings/channels/new`, `/settings/channels/edit/:channelId`)

| File | Where the input shows up |
|---|---|
| `frontend/src/container/FormAlertChannels/index.tsx` | Channel name + send-resolved / common fields |
| `frontend/src/container/FormAlertChannels/Settings/Email.tsx` | "To" email field of the Email channel form |
| `frontend/src/container/FormAlertChannels/Settings/Webhook.tsx` | Webhook URL / username / password fields |

### Routing Policies (`/settings/channels` → routing policies tab)

| File | Where the input shows up |
|---|---|
| `frontend/src/container/RoutingPolicies/RoutingPolicies.tsx` | Search box on the routing policies list |

### Organization Settings (`/settings/org-settings`)

| File | Where the input shows up |
|---|---|
| `frontend/src/container/OrganizationSettings/InviteTeamMembers/index.tsx` | Email + name fields in the "Invite team members" form (used by the invite-members flow) |

### Members (`/settings/members`)

_None directly migrated this round_ — already on `@signozhq/ui/input`.

### Planned Downtime (`/settings/channels` → Planned Downtime, or `/planned-downtime` depending on plan)

| File | Where the input shows up |
|---|---|
| `frontend/src/container/PlannedDowntime/PlannedDowntime.tsx` | "Search downtime" text input above the list |

### Licenses (`/licenses`)

| File | Where the input shows up |
|---|---|
| `frontend/src/container/Licenses/ApplyLicenseForm.tsx` | License key text input on the apply-license form |

### Dashboards — list, detail, widget editor

| File | Where the input shows up | Route |
|---|---|---|
| `frontend/src/container/ListOfDashboard/DashboardsList.tsx` | Main "Search by name, description, or tags…" input on the dashboards list | `/dashboard` |
| `frontend/src/container/ListOfDashboard/RequestDashboardBtn.tsx` | "Request dashboard" modal input | `/dashboard` |
| `frontend/src/container/ListOfDashboard/DashboardTemplates/DashboardTemplatesModal.tsx` | Templates modal search input | `/dashboard` (open templates) |
| `frontend/src/container/DashboardContainer/DashboardDescription/index.tsx` | Dashboard description editor name field | `/dashboard/:dashboardId` |
| `frontend/src/container/GridCardLayout/GridCardLayout.tsx` | Section / row name inline edit | `/dashboard/:dashboardId` |
| `frontend/src/container/DashboardContainer/visualization/components/ChartManager/ChartManager.tsx` | Chart manager search input | `/dashboard/:dashboardId` |
| `frontend/src/container/NewWidget/LeftContainer/ExplorerColumnsRenderer.tsx` | Column-config inputs in the widget editor's left panel | `/dashboard/:dashboardId/:widgetId` |

### Logs (`/logs/logs-explorer`, `/logs/pipelines`)

| File | Where the input shows up | Route |
|---|---|---|
| `frontend/src/container/LogsFilters/index.tsx` | Logs filter sidebar search input | `/logs/logs-explorer` |
| `frontend/src/container/LogsSearchFilter/SearchFields/QueryBuilder/QueryBuilder.tsx` | Query-builder field value inputs in the legacy logs search | `/logs/logs-explorer` |
| `frontend/src/container/LogDetailedView/Overview.tsx` | Log details drawer Overview tab inputs (severity / body filters) | `/logs/logs-explorer` (open a log) |
| `frontend/src/container/PipelinePage/PipelineListsView/AddNewProcessor/ProcessorForm.tsx` | Add-new-processor form fields | `/logs/pipelines` |
| `frontend/src/container/PipelinePage/PipelineListsView/AddNewProcessor/FormFields/JsonFlattening.tsx` | JSON-flattening processor form | `/logs/pipelines` |
| `frontend/src/container/PipelinePage/PipelineListsView/AddNewPipeline/FormFields/NameInput.tsx` | "Pipeline name" field in the new-pipeline form | `/logs/pipelines` |

### Traces (`/traces-explorer`, trace details, funnels)

| File | Where the input shows up | Route |
|---|---|---|
| `frontend/src/container/Trace/Search/AllTags/Tag/TagKey.tsx` | Tag-key autocomplete input in the legacy trace search | `/trace` |
| `frontend/src/container/Trace/TraceGraphFilter/index.tsx` | Trace-graph filter search/value input | `/trace` |
| `frontend/src/container/SpanDetailsDrawer/SpanDetailsDrawer.tsx` | "Search resource attributes" input in the span details drawer | `/traces-explorer` → open span |
| `frontend/src/container/SpanDetailsDrawer/Attributes/Attributes.tsx` | Span details drawer → Attributes search | `/traces-explorer` → open span |
| `frontend/src/container/SpanDetailsDrawer/Events/Events.tsx` | Span details drawer → Events search | `/traces-explorer` → open span |
| `frontend/src/container/TraceWaterfall/AddSpanToFunnelModal/AddSpanToFunnelModal.tsx` | "Add span to funnel" modal name input (legacy waterfall) | `/trace/:id` |
| `frontend/src/pages/TraceDetailsV3/SpanDetailsPanel/SpanPercentile/SpanPercentilePanel.tsx` | Percentile filter input in span details v3 | `/trace/:id` (v3) |
| `frontend/src/pages/TraceDetailsV3/TraceWaterfall/AddSpanToFunnelModal/AddSpanToFunnelModal.tsx` | "Add span to funnel" modal in v3 waterfall | `/trace/:id` (v3) |
| `frontend/src/pages/TracesFunnels/components/SearchBar/SearchBar.tsx` | Search box on the funnels list page | `/traces/funnels` |
| `frontend/src/pages/TracesFunnels/components/RenameFunnel/RenameFunnel.tsx` | Rename-funnel modal input | `/traces/funnels` |

### Saved Views (`/logs/saved-views`, `/traces/saved-views`)

| File | Where the input shows up |
|---|---|
| `frontend/src/components/ExplorerCard/SaveViewWithName.tsx` | "Save view with name" inline input on the explorer save flow |
| `frontend/src/container/ExplorerOptions/ExplorerOptions.tsx` | "e.g. External http method view" — name input in the Save View modal across explorers |
| `frontend/src/pages/SaveView/index.tsx` | Rename saved view input on the saved-views list |

### Metrics Explorer (`/metrics-explorer`)

| File | Where the input shows up |
|---|---|
| `frontend/src/container/MetricsExplorer/MetricDetails/Metadata.tsx` | Metadata edit inputs in metric details |

### Messaging Queues (`/messaging-queues`)

| File | Where the input shows up |
|---|---|
| `frontend/src/pages/MessagingQueues/MQDetails/DropRateView/EvaluationTimeSelector.tsx` | Evaluation time selector inside Drop Rate view |

### Integrations (`/integrations`)

| File | Where the input shows up |
|---|---|
| `frontend/src/container/Integrations/CloudIntegration/AmazonWebServices/RegionForm/RenderConnectionParams.tsx` | Connection-params text fields in AWS cloud integration setup |

### Ingestion Settings (`/settings/ingestion-settings`)

| File | Where the input shows up |
|---|---|
| `frontend/src/container/IngestionSettings/MultiIngestionSettings.tsx` | "Search for ingestion key…" + add/edit ingestion-key name fields. `<InputNumber>` usages in this file still come from antd. |

### Onboarding (`/get-started/*`, `/onboarding`)

| File | Where the input shows up |
|---|---|
| `frontend/src/container/OnboardingContainer/Steps/DataSource/DataSource.tsx` | Custom data source name input |
| `frontend/src/container/OnboardingContainer/Steps/EnvironmentDetails/EnvironmentDetails.tsx` | Environment details (env name / app name) inputs |

### Other shared components (rendered on multiple routes)

| File | Where it shows up |
|---|---|
| `frontend/src/components/CustomTimePicker/TimezonePicker.tsx` | Timezone search input inside the global custom time picker — visible on dashboards, logs, traces, alerts header |
| `frontend/src/components/InputWithLabel/InputWithLabel.tsx` | Generic labeled-input wrapper — used in invite flows, threshold editing, etc. |
| `frontend/src/components/QuickFilters/QuickFiltersSettings/QuickFiltersSettings.tsx` | "Search filters" input inside the Quick Filters settings drawer (logs/traces/infra/metrics quick-filters) |
| `frontend/src/components/QuickFilters/FilterRenderers/Checkbox/Checkbox.tsx` | Search box at the top of each checkbox-style quick filter |
| `frontend/src/container/QueryTable/Drilldown/BreakoutOptions.tsx` | "Breakout by" attribute search input in the query-table drilldown menu (dashboards, alerts) |
| `frontend/src/components/LogsFormatOptionsMenu/LogsFormatOptionsMenu.tsx` | "Search…" input inside the "Add column" picker in the logs format options menu (rendered on `/logs/logs-explorer`). `<InputNumber>` for max-line config still comes from antd. |

### `styled(Input)` wrappers — `.ts` style files

These wrap the now-`@signozhq/ui` `Input` with styled-components. CSS selectors target the descendant `<input>` element so behavior should be unchanged, but visually re-verify on the routes below.

| File | Verification route |
|---|---|
| `frontend/src/container/Version/styles.ts` | Status page `/status` — confirm input width = 183px |

> `Trace/Filters/Panel/PanelBody/Duration/styles.ts` was attempted and reverted — see the "Reverted" section at the top.

---

## Smoke-test checklist

A short loop that covers the bulk of what changed:

1. **Alerts → New alert** (`/alerts/new`) — add a threshold, type a name + value, switch evaluation window unit, expand Advanced Options, set time input, save.
2. **Channels → New channel** (`/settings/channels/new`) — pick Email, fill the "to" field; pick Webhook, fill URL.
3. **Dashboards** — open a dashboard, edit a panel (`/dashboard/:dashboardId/:widgetId`) → set context-link label/URL/params, edit explorer columns. Then on the list page (`/dashboard`) open the Templates modal and the "Request dashboard" modal.
4. **Logs Explorer** (`/logs/logs-explorer`) — type into the sidebar filter search, open a log row → Overview tab.
5. **Logs Pipelines** (`/logs/pipelines`) — open "Add new pipeline" and "Add new processor", switch processor type to JSON Flattening / CSV.
6. **Traces Explorer** (`/traces-explorer`) — open a span, search inside Attributes + Events tabs.
7. **Trace details V3** (`/trace/:id`) — open the percentile panel, open "Add span to funnel".
8. **Funnels list** (`/traces/funnels`) — type in the search bar, rename a funnel.
9. **Saved Views** (`/logs/saved-views`, `/traces/saved-views`) — rename a view; from an explorer, "Save view as…".
10. **Metrics Explorer** (`/metrics-explorer/explorer`) — open Inspect → time aggregation; open metric details → Metadata tab.
11. **Integrations → AWS** — open AWS cloud integration → Region form.
12. **Onboarding** (`/get-started`) — pick "Custom" data source, fill env/app names.
13. **Custom time picker** — open the global time picker anywhere, switch to "Custom" → type in the timezone search.
14. **Quick filters** — on `/logs/logs-explorer` or `/traces-explorer`, open the quick-filter settings drawer and search inside.
15. **Org settings → Invite members** (`/settings/org-settings`) — open invite flow, fill email + name.
16. **Planned downtime** — search the list.
17. **Licenses** (`/licenses`) — paste a license key in the input.

For each: confirm typing, controlled value, placeholder, disabled state, and form-validation error display all behave the same as before.

---

## Skipped (still on antd) — 61 files

After the migration, 61 files still import `Input` from antd. None of them use a plain `<Input>` that can be migrated — each one is kept on antd for one of the reasons below.

Kept on antd because they use features the `@signozhq/ui` `Input` does not expose. No action required unless these are migrated separately later.

**Use `Input.TextArea` / `Input.Password` / `Input.Search` / `Input.Group`:**
`CreateAlertV2/EvaluationSettings/EvaluationCadence/EvaluationCadence.tsx`,
`CreateAlertV2/EvaluationSettings/EvaluationCadence/EvaluationCadenceDetails.tsx`,
`CreateAlertV2/NotificationSettings/NotificationMessage.tsx`,
`QueryBuilder/components/Formula/Formula.tsx`,
`OptionsMenu/AddColumnField/index.tsx`,
`LogsSearchFilter/index.tsx`,
`RoutingPolicies/RoutingPolicyDetails.tsx`,
`DashboardContainer/DashboardSettings/DashboardVariableSettings/VariableItem/VariableItem.tsx`,
`DashboardContainer/DashboardSettings/General/index.tsx`,
`FormAlertChannels/Settings/MsTeams.tsx`,
`MySettings/UserInfo/index.tsx`,
`Login/index.tsx`,
`PipelinePage/PipelineListsView/AddNewPipeline/FormFields/DescriptionTextArea.tsx`,
`components/HeaderRightSection/FeedbackModal.tsx`,
`pages/TracesFunnelDetails/components/FunnelConfiguration/AddFunnelStepDetailsModal.tsx`,
`pages/TracesFunnelDetails/components/FunnelConfiguration/AddFunnelDescriptionModal.tsx`,
`pages/TracesExplorer/Filter/SectionContent.tsx`.

**Destructure `const { TextArea/Search } = Input`:**
`Trace/Filters/Panel/PanelBody/CommonCheckBox/index.tsx`,
`Trace/Filters/Panel/PanelBody/SearchTraceID/index.tsx`,
`Trace/Search/styles.ts`,
`ListAlertRules/ListAlert.tsx`,
`FormAlertRules/styles.ts`,
`FormAlertChannels/Settings/Opsgenie.tsx`,
`FormAlertChannels/Settings/Pager.tsx`,
`FormAlertChannels/Settings/Slack.tsx`,
`NewWidget/RightContainer/SettingSections/GeneralSettingsSection/GeneralSettingsSection.tsx`,
`AnomalyAlertEvaluationView/AnomalyAlertEvaluationView.tsx`.

**`InputNumber` co-used:**
`NewWidget/RightContainer/Threshold/Threshold.tsx`,
`components/LogsFormatOptionsMenu/LogsFormatOptionsMenu.tsx`.

**Typed `InputRef`:**
`DashboardContainer/DashboardVariablesSelection/TextboxVariableInput.tsx`,
`NewWidget/RightContainer/SettingSections/GeneralSettingsSection/GeneralSettingsSection.tsx`,
`PipelinePage/components/TagInput.tsx`,
`components/OverflowInputToolTip/OverflowInputToolTip.tsx`,
`components/CustomTimePicker/CustomTimePicker.tsx`,
`components/Input/index.tsx`,
`pages/AlertDetails/AlertHeader/ActionButtons/RenameModal.tsx`,
`LogsSearchFilter/index.tsx`.

**Use `addonBefore` / `addonAfter`:**
`QueryBuilder/components/Query/Query.tsx`,
`QueryBuilder/components/Formula/Formula.tsx`,
`GridCardLayout/GridCard/FullView/index.tsx`,
`GridCardLayout/WidgetHeader/index.tsx`,
`OnboardingV2Container/InviteTeamMembers/InviteTeamMembers.tsx`,
`NewWidget/LeftContainer/QuerySection/QueryBuilder/ClickHouse/query.tsx`,
`NewWidget/LeftContainer/QuerySection/QueryBuilder/promQL/query.tsx`,
`components/Input/index.tsx`,
`pages/TracesExplorer/Filter/DurationSection.tsx`.

**Use `allowClear`:**
`Trace/Search/AllTags/Tag/TagKey.tsx` _(migrated — `allowClear` was only used elsewhere)_,
`ServiceTable/Filter/FilterDropdown.tsx`,
`ServiceApplication/Filter/FilterDropdown.tsx`,
`LogsSearchFilter/index.tsx`,
`MetricsExplorer/MetricDetails/AllAttributesValue.tsx`,
`GridCardLayout/GridCard/FullView/index.tsx`,
`NewWidget/RightContainer/SettingSections/GeneralSettingsSection/GeneralSettingsSection.tsx`,
`AnomalyAlertEvaluationView/AnomalyAlertEvaluationView.tsx`,
`AllError/index.tsx`,
`PipelinePage/Layouts/Pipeline/PipelinesSearchSection.tsx`,
`lib/uPlotV2/components/Legend/Legend.tsx`.

**Use `bordered`, `status`, or `size="small|middle|large"`:**
`OrganizationSettings/DisplayName/index.tsx` (size, status),
`FormAlertRules/labels/index.tsx` (bordered),
`DashboardContainer/DashboardVariablesSelection/TextboxVariableInput.tsx` (bordered),
`MetricsExplorer/MetricDetails/AllAttributes.tsx` (size),
`MetricsExplorer/MetricDetails/AllAttributesValue.tsx` (size),
`AllError/index.tsx` (size),
`components/CustomTimePicker/CustomTimePicker.tsx` (status),
`QueryBuilder/components/Query/Query.tsx` (size),
`QueryBuilder/components/Formula/Formula.tsx` (size),
`NewWidget/LeftContainer/QuerySection/QueryBuilder/ClickHouse/query.tsx` (size),
`NewWidget/LeftContainer/QuerySection/QueryBuilder/promQL/query.tsx` (size).

**`styled(Input)` in `.ts` style files (DOM structure differs):**
`Trace/Filters/Panel/PanelBody/Duration/styles.ts`,
`Version/styles.ts`.

**Aliased-only `Input as X` (no plain `<Input>`):**
`ResetPassword/index.tsx`.

**Already on `@signozhq/ui/input`** (no diff this round): Retention, AuthnOIDC/SAML/Google + their helper sections (ClaimMapping, RoleMapping, AttributeMapping, DomainMapping), ForgotPassword, IntegrationsHeader, OnboardingQuestionaire (Invite + AboutSigNoz), AIAssistant/ChatInput, ServiceAccountsSettings, MembersSettings, ServiceAccountDrawer (EditKey + AddKey), InviteMembersModal, EditMemberDrawer, RolesSettings + CreateRoleModal, SignUp, plus the rest of the `@signozhq/ui/input` adopters listed in `git grep "@signozhq/ui/input"`.
