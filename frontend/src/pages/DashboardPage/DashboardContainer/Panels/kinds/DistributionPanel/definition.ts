import { ChartColumnBig } from '@signozhq/icons';

import { QueryBuilderField } from 'components/QueryBuilderV2/queryBuilderFields.types';

import type { PanelDefinition } from '../../types/panelDefinition';
import { QueryModeKind } from '../../types/panelCapabilities';
import QueryBuilderEditorPane from 'pages/DashboardPage/DashboardContainer/PanelEditor/PanelEditorQueryBuilder/QueryBuilderEditorPane';
import Renderer from './Renderer';
import { sections } from './sections';
import { getDistributionDataWarning } from './warning';
import {
	Querybuildertypesv5RequestTypeDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { QueryMode } from 'types/api/queryBuilder/queryBuilderData';

export const definition: PanelDefinition<'signoz/DistributionPanel'> = {
	kind: 'signoz/DistributionPanel',
	displayName: 'Distribution',
	mode: 'query',
	icon: ChartColumnBig,
	Renderer,
	EditorPane: QueryBuilderEditorPane,
	sections,
	supportedQueryModesKindMap: {
		// Only metrics carry a bucket axis; the request rejects the other signals.
		[QueryMode.QUERY_BUILDER]: {
			kind: QueryModeKind.SIGNAL,
			signals: [TelemetrytypesSignalDTO.metrics],
		},
		[QueryMode.CLICKHOUSE]: { kind: QueryModeKind.SIGNAL_LESS },
		[QueryMode.PROM]: { kind: QueryModeKind.SIGNAL_LESS },
	},
	// The request rejects both, as for heatmap: a point is a count per bucket.
	queryBuilderFields: {
		[QueryBuilderField.Functions]: { state: 'hidden' },
		[QueryBuilderField.Having]: { state: 'hidden' },
	},
	// No width-derived step: there is no time axis, and a histogram's counts do not
	// depend on the step.
	queryCapabilities: {
		requestType: Querybuildertypesv5RequestTypeDTO.distribution,
		formatTableResultForUI: false,
		bucketedStepInterval: false,
		orderTiebreaker: false,
		serverPaginated: false,
	},
	getDataWarning: getDistributionDataWarning,
	actions: {
		view: true,
		edit: true,
		clone: true,
		download: { csv: false, png: true, svg: true },
		createAlert: false,
		search: false,
		drilldown: false,
	},
};
