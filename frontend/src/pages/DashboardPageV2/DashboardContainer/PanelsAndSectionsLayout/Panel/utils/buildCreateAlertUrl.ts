import type {
	DashboardtypesPanelDTO,
	DashboardtypesPanelPluginDTO,
} from 'api/generated/services/sigNoz.schemas';
import { YAxisSource } from 'components/YAxisUnitSelector/types';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { PANEL_KIND_TO_PANEL_TYPE } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelKind';
import { fromPerses } from 'pages/DashboardPageV2/DashboardContainer/queryV5/persesQueryAdapters';

function readPanelUnit(
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
 * Builds the `/alerts/new` URL that seeds the alert builder from a panel's query,
 * mirroring V1's `useCreateAlerts`: the panel's V5 queries are translated to the
 * V1 `Query` the alert page reads from `compositeQuery`, tagged with the panel
 * type, entity version, and a `dashboards` source.
 *
 * Unlike V1 there is no `/substitute_vars` round-trip — V2 has no query-variable
 * plumbing yet, so any dashboard-variable references travel through verbatim.
 */
export function buildCreateAlertUrl(panel: DashboardtypesPanelDTO): string {
	const panelType = PANEL_KIND_TO_PANEL_TYPE[panel.spec.plugin.kind];
	const query = fromPerses(panel.spec.queries, panelType);

	const unit = readPanelUnit(panel.spec.plugin);
	if (unit) {
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

	return `${ROUTES.ALERTS_NEW}?${params.toString()}`;
}
