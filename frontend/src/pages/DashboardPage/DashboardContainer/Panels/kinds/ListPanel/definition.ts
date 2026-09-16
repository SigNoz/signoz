import { List } from '@signozhq/icons';

import type { PanelDefinition } from '../../types/panelDefinition';
import ListEditorPane from './ListEditorPane';
import Renderer from './Renderer';
import { sections } from './sections';
import {
	Querybuildertypesv5RequestTypeDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { OPERATORS } from 'constants/queryBuilder';
import { EQueryType } from 'types/common/dashboard';

export const definition: PanelDefinition<'signoz/ListPanel'> = {
	kind: 'signoz/ListPanel',
	displayName: 'List',
	mode: 'query',
	icon: List,
	Renderer,
	EditorPane: ListEditorPane,
	// Raw records come from logs and traces; metrics don't produce row data.
	supportedSignals: [
		TelemetrytypesSignalDTO.logs,
		TelemetrytypesSignalDTO.traces,
	],
	// Raw rows have no aggregation, so step interval / having never apply, and the
	// Where clause searches the log/span body via `body CONTAINS`. Traces additionally
	// hide `limit` (the server paginates raw spans). Mirrors QueryBuilderV2's internal
	// list configs — the capabilities guard is the single source for both.
	supportedQueryTypes: [EQueryType.QUERY_BUILDER],
	queryBuilderFields: {
		default: {
			stepInterval: { isHidden: true, isDisabled: true },
			having: { isHidden: true, isDisabled: true },
			filters: { customKey: 'body', customOp: OPERATORS.CONTAINS },
		},
		[TelemetrytypesSignalDTO.traces]: {
			limit: { isHidden: true, isDisabled: true },
		},
	},
	sections,
	// The only kind reading raw rows: they page server-side, and the sort needs a
	// tiebreaker so a duplicated sort key can't repeat or skip a row across pages.
	queryCapabilities: {
		requestType: Querybuildertypesv5RequestTypeDTO.raw,
		formatTableResultForUI: false,
		bucketedStepInterval: false,
		orderTiebreaker: true,
		serverPaginated: true,
	},
	actions: {
		view: true,
		edit: true,
		clone: true,
		download: { csv: false, png: true, svg: true },
		createAlert: false,
		search: true,
		drilldown: false,
	},
};
