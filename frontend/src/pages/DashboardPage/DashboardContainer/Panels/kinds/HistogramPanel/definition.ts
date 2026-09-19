import { BarChart } from '@signozhq/icons';

import type { PanelDefinition } from '../../types/panelDefinition';
import QueryBuilderEditorPane from 'pages/DashboardPage/DashboardContainer/PanelEditor/PanelEditorQueryBuilder/QueryBuilderEditorPane';
import Renderer from './Renderer';
import { sections } from './sections';
import {
	Querybuildertypesv5RequestTypeDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { EQueryType } from 'types/common/dashboard';

import { AI_QUERY_MODE } from '../../types/queryModes';

export const definition: PanelDefinition<'signoz/HistogramPanel'> = {
	kind: 'signoz/HistogramPanel',
	displayName: 'Histogram',
	mode: 'query',
	icon: BarChart,
	Renderer,
	EditorPane: QueryBuilderEditorPane,
	sections,
	supportedQueryModes: {
		[EQueryType.QUERY_BUILDER]: {
			kind: 'signal',
			signals: [
				TelemetrytypesSignalDTO.metrics,
				TelemetrytypesSignalDTO.logs,
				TelemetrytypesSignalDTO.traces,
			],
		},
		[EQueryType.CLICKHOUSE]: { kind: 'signal-less' },
		[EQueryType.PROM]: { kind: 'signal-less' },
		[AI_QUERY_MODE]: {
			kind: 'signal',
			signals: [TelemetrytypesSignalDTO.traces],
		},
	},
	queryBuilderFields: {},
	// Buckets are computed client-side from the raw series, so the request is a plain
	// time series — the bucket count is a display concern, not a query one.
	queryCapabilities: {
		requestType: Querybuildertypesv5RequestTypeDTO.time_series,
		formatTableResultForUI: false,
		bucketedStepInterval: false,
		orderTiebreaker: false,
		serverPaginated: false,
	},
	actions: {
		view: true,
		edit: true,
		clone: true,
		download: { csv: false, png: true, svg: true },
		createAlert: true,
		search: false,
		drilldown: false,
	},
};
