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

export const definition: PanelDefinition<'signoz/BarChartPanel'> = {
	kind: 'signoz/BarChartPanel',
	displayName: 'Bar Chart',
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
	// Bars are binned client-side from a raw time series, so the request asks for a
	// step interval wide enough to keep the bar count readable (V1 parity).
	queryCapabilities: {
		requestType: Querybuildertypesv5RequestTypeDTO.time_series,
		formatTableResultForUI: false,
		bucketedStepInterval: true,
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
		drilldown: true,
	},
};
