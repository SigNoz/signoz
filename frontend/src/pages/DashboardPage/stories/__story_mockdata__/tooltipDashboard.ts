/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTimeSeriesPanelSpecDTOKind as TimeSeriesKind,
	DashboardtypesTimePreferenceDTO as TimePreference,
	type DashboardtypesDashboardSpecDTOPanels,
	type DashboardtypesGettableDashboardV2DTO,
	type GetDashboardV2200,
} from 'api/generated/services/sigNoz.schemas';

import { dashboardResponse, PANEL_IDS, VARIABLE_KINDS } from './dashboard';

export const TOOLTIP_DASHBOARD_NAME =
	'Checkout service overview across every production region, by service and owner';

export const TOOLTIP_DASHBOARD_DESCRIPTION =
	'Traffic, errors and latency for the checkout path, broken down by service, region and deployment channel. Owned by the platform observability team; the runbook is at https://signoz.io/docs/dashboards/ and the rotation is in PagerDuty.';

// Two fit beside the title; the rest fall behind the `+N` badge.
export const TOOLTIP_DASHBOARD_TAGS = [
	{ key: 'env', value: 'production-eu-central-1' },
	{ key: 'team', value: 'platform-observability' },
	{ key: 'component', value: 'otel-collector' },
	{ key: 'owner', value: 'sre-oncall-primary' },
	{ key: 'tier', value: 'tier-0-revenue-critical' },
	{ key: 'compliance', value: 'soc2-in-scope' },
];

export const TOOLTIP_PANEL_NAME =
	'Request rate by service, region and deployment channel, excluding synthetic traffic';

export const TOOLTIP_PANEL_DESCRIPTIONS: Record<string, string> = {
	'request-rate':
		'Requests per second per service, taken from `signoz_calls_total` and filtered to the selected environment. Synthetic and health-check traffic is excluded, so this reads lower than the load balancer count.',
	'error-rate':
		'Share of 5xx responses over the selected window, rated against the error budget for the quarter.',
};

export const TOOLTIP_SELECTED_SERVICES = [
	'checkout',
	'payments',
	'inventory',
	'notifications',
	'checkout-2',
	'payments-2',
	'inventory-2',
	'notifications-2',
];

export const TOOLTIP_WARNED_METRIC = 'signoz_apdex';

/**
 * The page's own document, rewritten to the lengths the fixture is too tame to
 * show: a title and a description that overflow, six tags, panel descriptions
 * that run past a line, and a panel on its own time preference.
 */
export const tooltipDashboardDocument =
	(): DashboardtypesGettableDashboardV2DTO => {
		const document = dashboardResponse({
			panels: PANEL_IDS.length,
			sectioned: true,
			variables: [...VARIABLE_KINDS],
			locked: false,
		}).data;

		const panels = Object.fromEntries(
			Object.entries(document.spec.panels ?? {}).map(([id, panel]) => [
				id,
				{
					...panel,
					spec: {
						...panel.spec,
						display: {
							...panel.spec.display,
							name:
								id === 'request-rate' ? TOOLTIP_PANEL_NAME : panel.spec.display.name,
							description:
								TOOLTIP_PANEL_DESCRIPTIONS[id] ?? panel.spec.display.description,
						},
						plugin:
							id === 'error-rate' &&
							panel.spec.plugin.kind === TimeSeriesKind['signoz/TimeSeriesPanel']
								? {
										...panel.spec.plugin,
										spec: {
											...panel.spec.plugin.spec,
											visualization: { timePreference: TimePreference.last_1_month },
										},
									}
								: panel.spec.plugin,
					},
				},
			]),
		) as DashboardtypesDashboardSpecDTOPanels;

		return {
			...document,
			name: TOOLTIP_DASHBOARD_NAME,
			tags: TOOLTIP_DASHBOARD_TAGS,
			spec: {
				...document.spec,
				display: {
					name: TOOLTIP_DASHBOARD_NAME,
					description: TOOLTIP_DASHBOARD_DESCRIPTION,
				},
				panels,
			},
		};
	};

export const tooltipDashboardResponse = (): GetDashboardV2200 => ({
	status: 'success',
	data: tooltipDashboardDocument(),
});

/**
 * The tooltip document with its layouts scrambled, the shape the JSON editor's
 * dangling-reference warning is built to catch.
 */
export const desyncedDashboardResponse = (): GetDashboardV2200 => {
	const document = tooltipDashboardDocument();
	const [firstGrid, ...rest] = document.spec.layouts ?? [];

	return {
		status: 'success',
		data: {
			...document,
			spec: {
				...document.spec,
				// The second grid goes, orphaning the panels it placed, and the
				// first gains slots for panels that are not in the spec: the two
				// ways a hand-edited document desyncs panels and layouts.
				layouts: [
					{
						...firstGrid,
						spec: {
							...firstGrid.spec,
							items: [
								...(firstGrid.spec?.items ?? []),
								{
									x: 0,
									y: 24,
									width: 6,
									height: 6,
									content: { $ref: '#/spec/panels/checkout-saturation' },
								},
								{
									x: 6,
									y: 24,
									width: 6,
									height: 6,
									content: { $ref: '#/spec/panels/payment-gateway-latency' },
								},
							],
						},
					},
					...rest.slice(1),
				],
			},
		},
	};
};
