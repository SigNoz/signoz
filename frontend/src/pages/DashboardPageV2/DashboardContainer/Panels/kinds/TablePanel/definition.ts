import type { PanelDefinition } from '../../types/panelDefinition';
import Renderer from './Renderer';
import { sections } from './sections';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';

export const definition: PanelDefinition<'signoz/TablePanel'> = {
	kind: 'signoz/TablePanel',
	displayName: 'Table',
	Renderer,
	sections,
	supportedSignals: [
		TelemetrytypesSignalDTO.metrics,
		TelemetrytypesSignalDTO.logs,
		TelemetrytypesSignalDTO.traces,
	],
	// Tables carry tabular data worth exporting (V1 parity: download is table-only).
	actions: {
		view: true,
		edit: true,
		clone: true,
		download: true,
		createAlert: false,
		// V1 parity: only tables (and lists) expose the header search box.
		search: true,
	},
};
