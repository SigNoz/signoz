import { Earth } from '@signozhq/icons';
import { loadedSubdivisionsStore } from 'lib/visualization/charts/GeoMap/geo/subdivisionCache';

import { QueryBuilderField } from 'components/QueryBuilderV2/queryBuilderFields.types';

import type { PanelDefinition } from '../../types/panelDefinition';
import { QueryTypeKind } from '../../types/panelCapabilities';
import QueryBuilderEditorPane from 'pages/DashboardPage/DashboardContainer/PanelEditor/PanelEditorQueryBuilder/QueryBuilderEditorPane';
import Renderer from './Renderer';
import { MAX_ROWS } from './constants';
import { sections } from './sections';
import { pruneStaleBindings } from './utils/pruneStaleBindings';
import { getGeoMapDataWarning } from './utils/warnings';
import { Querybuildertypesv5RequestTypeDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5RequestTypeDTO';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas/telemetrytypesSignalDTO';
import { EQueryType } from 'types/common/dashboard';

export const definition: PanelDefinition<'signoz/GeoMapPanel'> = {
	kind: 'signoz/GeoMapPanel',
	displayName: 'Geo Map',
	mode: 'query',
	icon: Earth,
	Renderer,
	EditorPane: QueryBuilderEditorPane,
	sections,
	supportedQueryTypesKindMap: {
		[EQueryType.QUERY_BUILDER]: {
			kind: QueryTypeKind.SIGNAL,
			signals: [
				TelemetrytypesSignalDTO.metrics,
				TelemetrytypesSignalDTO.logs,
				TelemetrytypesSignalDTO.traces,
			],
		},
		[EQueryType.CLICKHOUSE]: { kind: QueryTypeKind.SIGNAL_LESS },
	},
	queryBuilderFields: {
		// The location comes from the group by.
		[QueryBuilderField.GroupBy]: {
			state: 'pinned',
			placeholder: 'Country, state, or lat + long (e.g. geo.country.iso_code)',
		},
		// Order means nothing on a map, and a limit would drop locations.
		[QueryBuilderField.OrderBy]: { state: 'hidden' },
		[QueryBuilderField.Limit]: { state: 'hidden' },
		// Pinned so it opens empty: the group-by template a click would seed names nothing here.
		[QueryBuilderField.Legend]: {
			state: 'pinned',
			placeholder: 'Name for this value, e.g. Error rate',
		},
		// A trace operator returns spans, not one row per location.
		[QueryBuilderField.TraceOperator]: { state: 'hidden' },
	},
	// One joined row per location, so colour and size can come from different queries.
	queryCapabilities: {
		requestType: Querybuildertypesv5RequestTypeDTO.scalar,
		formatTableResultForUI: true,
		bucketedStepInterval: false,
		orderTiebreaker: false,
		serverPaginated: false,
		defaultRowLimit: MAX_ROWS,
	},
	syncedQueryBuilderFields: [QueryBuilderField.GroupBy],
	getDataWarning: getGeoMapDataWarning,
	reconcileWithQueries: pruneStaleBindings,
	dataWarningSource: loadedSubdivisionsStore,
	actions: {
		view: true,
		edit: true,
		clone: true,
		// The joined table, one row per location, placed or not.
		download: { csv: true, png: true, svg: false },
		createAlert: false,
		search: false,
		drilldown: true,
	},
};
