import type { PanelDefinition } from '../../types/panelDefinition';
import Renderer from './Renderer';
import { sections } from './sections';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';

export const definition: PanelDefinition<'signoz/ListPanel'> = {
	kind: 'signoz/ListPanel',
	displayName: 'List',
	Renderer,
	// Raw records come from logs and traces; metrics don't produce row data.
	supportedSignals: [
		TelemetrytypesSignalDTO.logs,
		TelemetrytypesSignalDTO.traces,
	],
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
