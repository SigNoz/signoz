import type {
	DashboardtypesPanelDTO,
	DashboardtypesPanelPluginDTO,
} from 'api/generated/services/sigNoz.schemas';
import { YAxisSource } from 'components/YAxisUnitSelector/types';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { PANEL_KIND_TO_PANEL_TYPE } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelKind';
import { fromPerses } from 'pages/DashboardPageV2/DashboardContainer/queryV5/persesQueryAdapters';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

import { deriveAlertPrefill, PanelAlertPrefill } from './deriveAlertPrefill';

/** The panel's configured y-axis unit, for the kinds that carry one. */
export function readPanelUnit(
	plugin: DashboardtypesPanelPluginDTO,
): string | undefined {
	switch (plugin.kind) {
		case 'signoz/TimeSeriesPanel':
		case 'signoz/BarChartPanel':
		case 'signoz/NumberPanel':
		case 'signoz/PieChartPanel':
			return plugin.spec.formatting?.unit;
		default:
			return undefined;
	}
}

/**
 * Assembles the `/alerts/new` URL from a ready V1 `Query`. An optional `prefill`
 * (issue #5291) also seeds the alert condition — occurrence, operator, threshold.
 */
export function buildAlertUrl(
	query: Query,
	panelType: PANEL_TYPES,
	unit?: string,
	prefill?: PanelAlertPrefill,
): string {
	if (unit) {
		// eslint-disable-next-line no-param-reassign
		query.unit = unit;
	}

	const params = new URLSearchParams();
	params.set(
		QueryParams.compositeQuery,
		encodeURIComponent(JSON.stringify(query)),
	);
	params.set(QueryParams.panelTypes, panelType);
	params.set(QueryParams.version, ENTITY_VERSION_V5);
	params.set(QueryParams.source, YAxisSource.DASHBOARDS);

	if (prefill?.threshold) {
		// Raw JSON: URLSearchParams encodes once; the alert page uses a bare JSON.parse.
		params.set(QueryParams.thresholds, JSON.stringify([prefill.threshold]));
	}
	if (prefill?.matchType) {
		params.set(QueryParams.matchType, prefill.matchType);
	}
	if (prefill?.operator) {
		params.set(QueryParams.compareOp, prefill.operator);
	}

	return `${ROUTES.ALERTS_NEW}?${params.toString()}`;
}

/**
 * Seeds the alert builder from a panel's query — the no-variable path, so any
 * dashboard-variable references travel through verbatim. When the dashboard has
 * selections, `useCreateAlertFromPanel` runs a `/substitute_vars` round-trip first
 * and assembles the URL from the resolved queries via {@link buildAlertUrl}.
 */
export function buildCreateAlertUrl(panel: DashboardtypesPanelDTO): string {
	const panelType = PANEL_KIND_TO_PANEL_TYPE[panel.spec.plugin.kind];
	const query = fromPerses(panel.spec.queries, panelType);
	const unit = readPanelUnit(panel.spec.plugin);
	return buildAlertUrl(
		query,
		panelType,
		unit,
		deriveAlertPrefill(panel, query, unit),
	);
}
