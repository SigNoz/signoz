import { ChartBarDecreasing } from '@signozhq/icons';

import { QueryBuilderField } from 'components/QueryBuilderV2/queryBuilderFields.types';

import type { PanelDefinition } from '../../types/panelDefinition';
import { QueryModeKind } from '../../types/panelCapabilities';
import QueryBuilderEditorPane from 'pages/DashboardPage/DashboardContainer/PanelEditor/PanelEditorQueryBuilder/QueryBuilderEditorPane';
import Renderer from './Renderer';
import { DEFAULT_LIMIT } from './constants';
import { sections } from './sections';
import { getTopListDataWarning } from './warnings';
import {
	Querybuildertypesv5RequestTypeDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { QueryMode } from 'types/api/queryBuilder/queryBuilderData';

export const definition: PanelDefinition<'signoz/TopListPanel'> = {
	kind: 'signoz/TopListPanel',
	displayName: 'Top List',
	mode: 'query',
	icon: ChartBarDecreasing,
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
