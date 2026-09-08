import { Grid3X3 } from '@signozhq/icons';

import type { PanelDefinition } from '../../types/panelDefinition';
import QueryBuilderEditorPane from 'pages/DashboardPage/DashboardContainer/PanelEditor/PanelEditorQueryBuilder/QueryBuilderEditorPane';
import Renderer from './Renderer';
import { sections } from './sections';
import {
	Querybuildertypesv5RequestTypeDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { EQueryType } from 'types/common/dashboard';

export const definition: PanelDefinition<'signoz/HeatmapPanel'> = {
	kind: 'signoz/HeatmapPanel',
	displayName: 'Heatmap',
	mode: 'query',
	icon: Grid3X3,
	Renderer,
	EditorPane: QueryBuilderEditorPane,
	sections,
	// Only metrics carry a bucket axis; the request rejects the other signals.
	supportedSignals: [TelemetrytypesSignalDTO.metrics],
	supportedQueryTypes: [
		EQueryType.QUERY_BUILDER,
		EQueryType.CLICKHOUSE,
		EQueryType.PROM,
	],
	// The request rejects both: a point is a count per bucket, not a single value.
	queryBuilderFields: {
		default: {
			functions: { isHidden: true, isDisabled: true },
			having: { isHidden: true, isDisabled: true },
		},
	},
	queryCapabilities: {
		requestType: Querybuildertypesv5RequestTypeDTO.heatmap,
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
		// A distribution per timestamp has no single value to threshold.
		createAlert: false,
		search: false,
		drilldown: false,
	},
};
