import { ChartBarDecreasing } from '@signozhq/icons';

import { QueryBuilderField } from 'components/QueryBuilderV2/queryBuilderFields.types';

import type { PanelDefinition } from '../../types/panelDefinition';
import QueryBuilderEditorPane from 'pages/DashboardPage/DashboardContainer/PanelEditor/PanelEditorQueryBuilder/QueryBuilderEditorPane';
import Renderer from './Renderer';
import { sections } from './sections';
import { getTopListDataWarning } from './warnings';
import {
	Querybuildertypesv5RequestTypeDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { EQueryType } from 'types/common/dashboard';

export const definition: PanelDefinition<'signoz/TopListPanel'> = {
	kind: 'signoz/TopListPanel',
	displayName: 'Top List',
	mode: 'query',
	icon: ChartBarDecreasing,
	Renderer,
	EditorPane: QueryBuilderEditorPane,
	sections,
	supportedSignals: [
		TelemetrytypesSignalDTO.metrics,
		TelemetrytypesSignalDTO.logs,
		TelemetrytypesSignalDTO.traces,
	],
	supportedQueryTypes: [EQueryType.QUERY_BUILDER, EQueryType.CLICKHOUSE],
	// Ranks a single query's value; the request rejects formulas and further queries.
	queryBuilderFields: {
		[QueryBuilderField.Formula]: { state: 'hidden' },
		[QueryBuilderField.AdditionalQueries]: { state: 'hidden' },
	},
	queryCapabilities: {
		requestType: Querybuildertypesv5RequestTypeDTO.scalar,
		formatTableResultForUI: false,
		bucketedStepInterval: false,
		orderTiebreaker: false,
		serverPaginated: false,
	},
	getDataWarning: getTopListDataWarning,
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
