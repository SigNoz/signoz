import type {
	DashboardtypesPanelDTO,
	DashboardtypesPanelFormattingDTO,
} from 'api/generated/services/sigNoz.schemas';
import { YAxisSource } from 'components/YAxisUnitSelector/types';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { PANEL_KIND_TO_PANEL_TYPE } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelKind';
import { fromPerses } from 'pages/DashboardPageV2/DashboardContainer/queryV5/persesQueryAdapters';

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
	const query = fromPerses(panel.spec.queries ?? [], panelType);

	// `formatting.unit` is shared by the formattable plugin specs; read it with a
	// localized cast rather than narrowing on kind (mirrors Panel's time-preference read).
	const unit = (
		panel.spec.plugin.spec as
			| { formatting?: DashboardtypesPanelFormattingDTO }
			| undefined
	)?.formatting?.unit;
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
