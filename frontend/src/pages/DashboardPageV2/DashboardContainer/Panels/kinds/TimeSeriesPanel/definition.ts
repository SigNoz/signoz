import { DataSource } from 'types/common/queryBuilder';

import type { PanelDefinition } from '../../types/panelDefinition';
import Renderer from './Renderer';
import { sections } from './sections';

export const definition: PanelDefinition<'signoz/TimeSeriesPanel'> = {
	kind: 'signoz/TimeSeriesPanel',
	displayName: 'Time Series',
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
