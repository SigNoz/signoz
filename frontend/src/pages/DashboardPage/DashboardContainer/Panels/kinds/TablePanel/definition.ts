import { Table } from '@signozhq/icons';

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

export const definition: PanelDefinition<'signoz/TablePanel'> = {
	kind: 'signoz/TablePanel',
	displayName: 'Table',
	mode: 'query',
	icon: Table,
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
		[AI_QUERY_MODE]: {
			kind: 'signal',
			signals: [TelemetrytypesSignalDTO.traces],
		},
	},
	queryBuilderFields: {},
	// The only kind that asks the server to transpose its scalar result into UI rows.
	queryCapabilities: {
		requestType: Querybuildertypesv5RequestTypeDTO.scalar,
		formatTableResultForUI: true,
		bucketedStepInterval: false,
		orderTiebreaker: false,
		serverPaginated: false,
	},
	// Tables carry tabular data worth exporting (V1 parity: download is table-only).
	actions: {
		view: true,
		edit: true,
		clone: true,
		download: { csv: true, png: true, svg: true },
		createAlert: false,
		// V1 parity: only tables (and lists) expose the header search box.
		search: true,
		drilldown: true,
	},
};
