import { DataSource } from 'types/common/queryBuilder';

import type { PanelDefinition } from '../../types/panelDefinition';
import Renderer from './Renderer';
import { sections } from './sections';

export const definition: PanelDefinition<'signoz/NumberPanel'> = {
	kind: 'signoz/NumberPanel',
	displayName: 'Number',
	Renderer,
	sections,
	supportedSignals: [DataSource.METRICS, DataSource.LOGS, DataSource.TRACES],
	actions: {
		view: true,
		edit: true,
		clone: true,
		download: false,
		createAlert: true,
		search: false,
	},
};
