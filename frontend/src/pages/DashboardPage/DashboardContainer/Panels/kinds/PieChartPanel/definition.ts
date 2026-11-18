import { EQueryType } from 'types/common/dashboard';
import { ChartPie } from '@signozhq/icons';

import type { PanelDefinition } from '../../types/panelDefinition';
import { QueryTypeKind } from '../../types/panelCapabilities';
import QueryBuilderEditorPane from 'pages/DashboardPage/DashboardContainer/PanelEditor/PanelEditorQueryBuilder/QueryBuilderEditorPane';
import Renderer from './Renderer';
import { sections } from './sections';
import {
	Querybuildertypesv5RequestTypeDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';

export const definition: PanelDefinition<'signoz/PieChartPanel'> = {
	kind: 'signoz/PieChartPanel',
	displayName: 'Pie Chart',
	mode: 'query',
	icon: ChartPie,
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
		[EQueryType.AI_QUERY_BUILDER]: {
			kind: QueryTypeKind.SIGNAL,
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
