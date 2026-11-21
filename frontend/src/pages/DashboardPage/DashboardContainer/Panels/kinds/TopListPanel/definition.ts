import { ChartBarDecreasing } from '@signozhq/icons';

import { QueryBuilderField } from 'components/QueryBuilderV2/queryBuilderFields.types';

import type { PanelDefinition } from '../../types/panelDefinition';
import { QueryTypeKind } from '../../types/panelCapabilities';
import QueryBuilderEditorPane from 'pages/DashboardPage/DashboardContainer/PanelEditor/PanelEditorQueryBuilder/QueryBuilderEditorPane';
import Renderer from './Renderer';
import { DEFAULT_LIMIT } from './constants';
import { sections } from './sections';
import { getTopListDataWarning } from './utils/warnings';
import { Querybuildertypesv5RequestTypeDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5RequestTypeDTO';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas/telemetrytypesSignalDTO';
import { EQueryType } from 'types/common/dashboard';

export const definition: PanelDefinition<'signoz/TopListPanel'> = {
	kind: 'signoz/TopListPanel',
	displayName: 'Top List',
	mode: 'query',
	icon: ChartBarDecreasing,
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
		// A list without a group by is a single row.
		[QueryBuilderField.GroupBy]: { state: 'pinned' },
		// Picks top or bottom N on the server; a client-side flip would show the top N reversed.
		[QueryBuilderField.OrderBy]: {
			state: 'pinned',
			placeholder: 'Default highest first',
		},
		[QueryBuilderField.Limit]: {
			state: 'pinned',
			placeholder: `Default ${DEFAULT_LIMIT} for Top List`,
		},
		// Ignored for logs and traces scalars; for metrics they apply before reduceTo.
		[QueryBuilderField.Functions]: { state: 'hidden' },
	},
	queryCapabilities: {
		requestType: Querybuildertypesv5RequestTypeDTO.scalar,
		formatTableResultForUI: false,
		bucketedStepInterval: false,
		orderTiebreaker: false,
		serverPaginated: false,
		defaultRowLimit: DEFAULT_LIMIT,
	},
	// Formulas join their inputs on group values, so every query groups by the same keys.
	syncedQueryBuilderFields: [QueryBuilderField.GroupBy],
	getDataWarning: getTopListDataWarning,
	actions: {
		view: true,
		edit: true,
		clone: true,
		download: { csv: true, png: true, svg: true },
		createAlert: false,
		search: false,
		drilldown: true,
	},
};
