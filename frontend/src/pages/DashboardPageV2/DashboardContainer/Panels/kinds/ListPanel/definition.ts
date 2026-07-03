import type { PanelDefinition } from '../../types/panelDefinition';
import Renderer from './Renderer';
import { sections } from './sections';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { OPERATORS } from 'constants/queryBuilder';
import { EQueryType } from 'types/common/dashboard';

export const definition: PanelDefinition<'signoz/ListPanel'> = {
	kind: 'signoz/ListPanel',
	displayName: 'List',
	Renderer,
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
	actions: {
		view: true,
		edit: true,
		clone: true,
		download: false,
		createAlert: false,
		search: true,
	},
};
