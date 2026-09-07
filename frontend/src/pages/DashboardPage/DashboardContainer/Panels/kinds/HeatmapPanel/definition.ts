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
	// A cell is a count per bucket, which only a metric carries a bucket axis for;
	// the heatmap request rejects the logs and traces signals outright.
	supportedSignals: [TelemetrytypesSignalDTO.metrics],
	supportedQueryTypes: [
		EQueryType.QUERY_BUILDER,
		EQueryType.CLICKHOUSE,
		EQueryType.PROM,
	],
	// A heatmap point is a count per bucket rather than a single value, so a
	// function has nothing to transform and a having clause would filter individual
	// cells out of a distribution that has to stay whole. The request rejects both.
	queryBuilderFields: {
		default: {
			functions: { isHidden: true, isDisabled: true },
			having: { isHidden: true, isDisabled: true },
		},
	},
	// The one kind asking for `heatmap`: the response carries one count per bucket at
	// each timestamp, with the shared bucket bounds on the aggregation's meta. The
	// bucket axis is the server's — unlike Histogram, the panel never re-bins.
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
		// An alert compares a series against a threshold; a distribution per timestamp
		// has no single value to compare.
		createAlert: false,
		search: false,
		drilldown: false,
	},
};
