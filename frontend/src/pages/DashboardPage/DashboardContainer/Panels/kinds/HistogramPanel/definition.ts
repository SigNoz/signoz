import { EQueryType } from 'types/common/dashboard';
import { BarChart } from '@signozhq/icons';

import type { PanelDefinition } from '../../types/panelDefinition';
import { QueryTypeKind } from '../../types/panelCapabilities';
import QueryBuilderEditorPane from 'pages/DashboardPage/DashboardContainer/PanelEditor/PanelEditorQueryBuilder/QueryBuilderEditorPane';
import Renderer from './Renderer';
import { sections } from './sections';
import {
	Querybuildertypesv5RequestTypeDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';

export const definition: PanelDefinition<'signoz/HistogramPanel'> = {
	kind: 'signoz/HistogramPanel',
	displayName: 'Histogram',
	mode: 'query',
	icon: BarChart,
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
		[EQueryType.PROM]: { kind: QueryTypeKind.SIGNAL_LESS },
		[EQueryType.AI_QUERY_BUILDER]: {
			kind: QueryTypeKind.SIGNAL,
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
