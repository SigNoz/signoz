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
	// Every timestamp is a full column of cells, so the request asks for a step interval
	// wide enough to keep the grid legible: at raw resolution a multi-day range is tens of
	// thousands of cells, each of them sub-pixel.
	queryCapabilities: {
		requestType: Querybuildertypesv5RequestTypeDTO.heatmap,
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
		// A distribution per timestamp has no single value to threshold.
		createAlert: false,
		search: false,
		drilldown: false,
	},
};
