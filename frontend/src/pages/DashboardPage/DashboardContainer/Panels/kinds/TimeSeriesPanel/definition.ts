import type { PanelDefinition } from '../../types/panelDefinition';
import Renderer from './Renderer';
import { sections } from './sections';
import {
	Querybuildertypesv5RequestTypeDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { EQueryType } from 'types/common/dashboard';

export const definition: PanelDefinition<'signoz/TimeSeriesPanel'> = {
	kind: 'signoz/TimeSeriesPanel',
	displayName: 'Time Series',
	Renderer,
	sections,
	supportedSignals: [
		TelemetrytypesSignalDTO.metrics,
		TelemetrytypesSignalDTO.logs,
		TelemetrytypesSignalDTO.traces,
	],
	supportedQueryTypes: [
		EQueryType.QUERY_BUILDER,
		EQueryType.CLICKHOUSE,
		EQueryType.PROM,
	],
	queryBuilderFields: {},
	query: {
		requestType: Querybuildertypesv5RequestTypeDTO.time_series,
		formatTableResultForUI: false,
		bucketedStepInterval: false,
		orderTiebreaker: false,
		serverPaginated: false,
		listView: false,
		traceOperator: true,
	},
	actions: {
		view: true,
		edit: true,
		clone: true,
		download: { csv: false, png: true, svg: true },
		createAlert: true,
		search: false,
		drilldown: true,
	},
};
