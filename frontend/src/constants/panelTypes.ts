import Uplot from 'components/Uplot';
import GridTableComponent from 'container/GridTableComponent';
import GridValueComponent from 'container/GridValueComponent';
import LogsPanelComponent from 'container/LogsPanelTable/LogsPanelComponent';
import TracesTableComponent from 'container/TracesTableComponent/TracesTableComponent';
import { DataSource } from 'types/common/queryBuilder';

import { PANEL_TYPES } from './queryBuilder';

export const PANEL_TYPES_COMPONENT_MAP = {
	[PANEL_TYPES.TIME_SERIES]: Uplot,
	[PANEL_TYPES.VALUE]: GridValueComponent,
	[PANEL_TYPES.TABLE]: GridTableComponent,
	[PANEL_TYPES.TRACE]: null,
	[PANEL_TYPES.LIST]: LogsPanelComponent,
	[PANEL_TYPES.EMPTY_WIDGET]: null,
	[PANEL_TYPES.BAR]: Uplot,
} as const;

export const getComponentForPanelType = (
	panelType: PANEL_TYPES,
	dataSource?: DataSource,
): React.ComponentType<any> | null => {
	const componentsMap = {
		[PANEL_TYPES.TIME_SERIES]: Uplot,
		[PANEL_TYPES.VALUE]: GridValueComponent,
		[PANEL_TYPES.TABLE]: GridTableComponent,
		[PANEL_TYPES.TRACE]: null,
		[PANEL_TYPES.LIST]:
			dataSource === DataSource.LOGS ? LogsPanelComponent : TracesTableComponent,
		[PANEL_TYPES.BAR]: Uplot,
		[PANEL_TYPES.PIE]: null,
		[PANEL_TYPES.HISTOGRAM]: Uplot,
		[PANEL_TYPES.EMPTY_WIDGET]: null,
	};

	return componentsMap[panelType];
};

export const AVAILABLE_EXPORT_PANEL_TYPES = [
	PANEL_TYPES.TIME_SERIES,
	PANEL_TYPES.TABLE,
	PANEL_TYPES.LIST,
];
