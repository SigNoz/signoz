import type { PanelDefinition } from '../../types/panelDefinition';
import Renderer from './Renderer';
import { sections } from './sections';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { EQueryType } from 'types/common/dashboard';

export const definition: PanelDefinition<'signoz/HistogramPanel'> = {
	kind: 'signoz/HistogramPanel',
	displayName: 'Histogram',
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
	actions: {
		view: true,
		edit: true,
		clone: true,
		download: { csv: false, png: true, svg: true },
		createAlert: true,
		search: false,
		drilldown: false,
	},
};
