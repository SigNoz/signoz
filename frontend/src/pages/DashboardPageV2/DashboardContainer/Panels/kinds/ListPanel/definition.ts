import { DataSource } from 'types/common/queryBuilder';

import type { PanelDefinition } from '../../types/panelDefinition';
import Renderer from './Renderer';
import { sections } from './sections';

export const definition: PanelDefinition<'signoz/ListPanel'> = {
	kind: 'signoz/ListPanel',
	displayName: 'List',
	Renderer,
	// Raw records come from logs and traces; metrics don't produce row data.
	supportedSignals: [DataSource.LOGS, DataSource.TRACES],
	sections,
	// Tabular records worth exporting; search filters rows like the Table kind.
	actions: {
		view: true,
		edit: true,
		clone: true,
		download: { csv: false, png: true, svg: true },
		createAlert: false,
	},
	headerControls: { search: true },
};
