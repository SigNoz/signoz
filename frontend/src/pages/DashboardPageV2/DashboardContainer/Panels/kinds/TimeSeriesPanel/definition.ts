import type { PanelDefinition } from '../../types/panelDefinition';
import Renderer from './Renderer';
import { sections } from './sections';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';

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
	actions: {
		view: true,
		edit: true,
		clone: true,
		download: false,
		createAlert: true,
		search: false,
	},
};
