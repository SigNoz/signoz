import { ChartPie } from '@signozhq/icons';

import type { PanelDefinition } from '../../types/panelDefinition';
import { QueryModeKind } from '../../types/panelCapabilities';
import QueryBuilderEditorPane from 'pages/DashboardPage/DashboardContainer/PanelEditor/PanelEditorQueryBuilder/QueryBuilderEditorPane';
import Renderer from './Renderer';
import { sections } from './sections';
import {
	Querybuildertypesv5RequestTypeDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { QueryMode } from 'types/common/dashboard';

export const definition: PanelDefinition<'signoz/PieChartPanel'> = {
	kind: 'signoz/PieChartPanel',
	displayName: 'Pie Chart',
	mode: 'query',
	icon: ChartPie,
	Renderer,
	EditorPane: QueryBuilderEditorPane,
	sections,
	supportedQueryModes: {
		[QueryMode.QUERY_BUILDER]: {
			kind: QueryModeKind.SIGNAL,
			signals: [
				TelemetrytypesSignalDTO.metrics,
				TelemetrytypesSignalDTO.logs,
				TelemetrytypesSignalDTO.traces,
			],
		},
		[QueryMode.CLICKHOUSE]: { kind: QueryModeKind.SIGNAL_LESS },
		[QueryMode.AI_QUERY_BUILDER]: {
			kind: QueryModeKind.SIGNAL,
			signals: [TelemetrytypesSignalDTO.traces],
		},
	},
	queryBuilderFields: {},
	queryCapabilities: {
		requestType: Querybuildertypesv5RequestTypeDTO.scalar,
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
		createAlert: false,
		search: false,
		drilldown: true,
	},
};
