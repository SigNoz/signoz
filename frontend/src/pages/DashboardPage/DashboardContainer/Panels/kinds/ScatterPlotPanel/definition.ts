import { ChartScatter } from '@signozhq/icons';

import type { PanelDefinition } from '../../types/panelDefinition';
import QueryBuilderEditorPane from 'pages/DashboardPage/DashboardContainer/PanelEditor/PanelEditorQueryBuilder/QueryBuilderEditorPane';
import Renderer from './Renderer';
import { MAX_PLOTTED_GROUPS } from './utils/prepareData';
import { sections } from './sections';
import { getScatterPlotDataWarning } from './utils/warning';
import {
	Querybuildertypesv5RequestTypeDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { EQueryType } from 'types/common/dashboard';
import { QueryBuilderField } from 'components/QueryBuilderV2/queryBuilderFields.types';

export const definition: PanelDefinition<'signoz/ScatterPlotPanel'> = {
	kind: 'signoz/ScatterPlotPanel',
	displayName: 'Scatter Plot',
	mode: 'query',
	icon: ChartScatter,
	Renderer,
	EditorPane: QueryBuilderEditorPane,
	sections,
	supportedSignals: [
		TelemetrytypesSignalDTO.metrics,
		TelemetrytypesSignalDTO.logs,
		TelemetrytypesSignalDTO.traces,
	],
	supportedQueryTypes: [
		EQueryType.QUERY_BUILDER,
		EQueryType.CLICKHOUSE,
		EQueryType.PROM,
	],
	queryBuilderFields: {
		legend_format: {
			state: 'hidden',
		},
		limit: {
			state: 'defaulted',
			placeholder: `Default ${MAX_PLOTTED_GROUPS.toLocaleString('en-US')} for Scatter Plot`,
		},
	},
	// Same request as Table: one joined row per group, so x and y can come from
	// different queries.
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
