import { ChartScatter } from '@signozhq/icons';

import type { PanelDefinition } from '../../types/panelDefinition';
import { QueryModeKind } from '../../types/panelCapabilities';
import QueryBuilderEditorPane from 'pages/DashboardPage/DashboardContainer/PanelEditor/PanelEditorQueryBuilder/QueryBuilderEditorPane';
import Renderer from './Renderer';
import { MAX_PLOTTED_GROUPS } from './utils/prepareData';
import { sections } from './sections';
import { getScatterPlotDataWarning } from './utils/warning';
import {
	Querybuildertypesv5RequestTypeDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { QueryMode } from 'types/api/queryBuilder/queryBuilderData';
import { QueryBuilderField } from 'components/QueryBuilderV2/queryBuilderFields.types';

export const definition: PanelDefinition<'signoz/ScatterPlotPanel'> = {
	kind: 'signoz/ScatterPlotPanel',
	displayName: 'Scatter Plot',
	mode: 'query',
	icon: ChartScatter,
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
		[QueryMode.PROM]: { kind: QueryModeKind.SIGNAL_LESS },
	},
	queryBuilderFields: {
		legend_format: {
			state: 'hidden',
		},
		limit: {
			state: 'pinned',
			placeholder: `Default ${MAX_PLOTTED_GROUPS.toLocaleString('en-US')} for Scatter Plot`,
		},
	},
	// One joined row per group, so x and y can come from different queries.
	queryCapabilities: {
		requestType: Querybuildertypesv5RequestTypeDTO.scalar,
		formatTableResultForUI: true,
		bucketedStepInterval: false,
		orderTiebreaker: false,
		serverPaginated: false,
		defaultRowLimit: MAX_PLOTTED_GROUPS,
	},
	// One group by everywhere, so the queries' results join row for row.
	syncedQueryBuilderFields: [QueryBuilderField.GroupBy],
	getDataWarning: getScatterPlotDataWarning,
	actions: {
		view: true,
		edit: true,
		clone: true,
		// Every group of the joined table, plotted or not.
		download: { csv: true, png: true, svg: true },
		createAlert: false,
		search: false,
		drilldown: true,
	},
};
