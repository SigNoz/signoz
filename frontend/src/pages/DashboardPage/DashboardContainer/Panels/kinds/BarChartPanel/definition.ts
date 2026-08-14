import type { PanelDefinition } from '../../types/panelDefinition';
import Renderer from './Renderer';
import { sections } from './sections';
import {
	Querybuildertypesv5RequestTypeDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { EQueryType } from 'types/common/dashboard';

export const definition: PanelDefinition<'signoz/BarChartPanel'> = {
	kind: 'signoz/BarChartPanel',
	displayName: 'Bar Chart',
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
	// Bars are binned client-side from a raw time series, so the request asks for a
	// step interval wide enough to keep the bar count readable (V1 parity).
	query: {
		requestType: Querybuildertypesv5RequestTypeDTO.time_series,
		formatTableResultForUI: false,
		bucketedStepInterval: true,
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
