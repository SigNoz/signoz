import { ChartLine } from '@signozhq/icons';

import type { PanelDefinition } from '../../types/panelDefinition';
import QueryBuilderEditorPane from 'pages/DashboardPage/DashboardContainer/PanelEditor/PanelEditorQueryBuilder/QueryBuilderEditorPane';
import Renderer from './Renderer';
import { sections } from './sections';
import {
	Querybuildertypesv5RequestTypeDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { QueryMode } from 'types/common/dashboard';

export const definition: PanelDefinition<'signoz/TimeSeriesPanel'> = {
	kind: 'signoz/TimeSeriesPanel',
	displayName: 'Time Series',
	mode: 'query',
	icon: ChartLine,
	Renderer,
	EditorPane: QueryBuilderEditorPane,
	sections,
	supportedQueryModes: {
		[QueryMode.QUERY_BUILDER]: {
			kind: 'signal',
			signals: [
				TelemetrytypesSignalDTO.metrics,
				TelemetrytypesSignalDTO.logs,
				TelemetrytypesSignalDTO.traces,
			],
		},
		[QueryMode.CLICKHOUSE]: { kind: 'signal-less' },
		[QueryMode.PROM]: { kind: 'signal-less' },
		[QueryMode.AI_QUERY_BUILDER]: {
			kind: 'signal',
			signals: [TelemetrytypesSignalDTO.traces],
		},
	},
	queryBuilderFields: {},
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
		drilldown: true,
	},
};
