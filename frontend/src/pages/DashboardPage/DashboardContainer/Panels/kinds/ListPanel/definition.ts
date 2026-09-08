import type { PanelDefinition } from '../../types/panelDefinition';
import Renderer from './Renderer';
import { sections } from './sections';
import {
	Querybuildertypesv5RequestTypeDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
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
	supportedQueryTypes: [EQueryType.QUERY_BUILDER],
	// No deviation from the baseline the raw request type below already implies.
	queryBuilderFields: {},
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
