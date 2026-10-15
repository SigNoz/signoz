import { Earth } from '@signozhq/icons';

import { QueryBuilderField } from 'components/QueryBuilderV2/queryBuilderFields.types';

import type { PanelDefinition } from '../../types/panelDefinition';
import { QueryModeKind } from '../../types/panelCapabilities';
import QueryBuilderEditorPane from 'pages/DashboardPage/DashboardContainer/PanelEditor/PanelEditorQueryBuilder/QueryBuilderEditorPane';
import Renderer from './Renderer';
import { MAX_ROWS } from './constants';
import { sections } from './sections';
import { getGeoMapDataWarning } from './warnings';
import {
	Querybuildertypesv5RequestTypeDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { QueryMode } from 'types/api/queryBuilder/queryBuilderData';

export const definition: PanelDefinition<'signoz/GeoMapPanel'> = {
	kind: 'signoz/GeoMapPanel',
	displayName: 'Geo Map',
	mode: 'query',
	icon: Earth,
	Renderer,
	EditorPane: QueryBuilderEditorPane,
	sections,
	supportedQueryModesKindMap: {
		[QueryMode.QUERY_BUILDER]: {
			kind: QueryModeKind.SIGNAL,
			signals: [
				TelemetrytypesSignalDTO.metrics,
				TelemetrytypesSignalDTO.logs,
				TelemetrytypesSignalDTO.traces,
			],
		},
		[QueryMode.CLICKHOUSE]: { kind: QueryModeKind.SIGNAL_LESS },
	},
	queryBuilderFields: {
		// The location comes from the group by.
		[QueryBuilderField.GroupBy]: { state: 'pinned' },
		// Order means nothing on a map, and a limit would drop locations.
		[QueryBuilderField.OrderBy]: { state: 'hidden' },
		[QueryBuilderField.Limit]: { state: 'hidden' },
		[QueryBuilderField.Functions]: { state: 'hidden' },
		[QueryBuilderField.Legend]: { state: 'hidden' },
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
