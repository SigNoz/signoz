import type { PanelActionCapabilities } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelDefinition';

/**
 * Every action the panel menu can offer: per-kind gated capabilities (minus
 * `search` and `drilldown`, which are renderer-wired controls, not menu items)
 * plus the chrome actions every kind gets. The `Record<PanelActionId, …>` below
 * forces a meta entry per id, so adding an action without declaring its gates is
 * a compile error.
 */
export type PanelActionId =
	| Exclude<keyof PanelActionCapabilities, 'search' | 'drilldown'>
	| 'move'
	| 'delete';
