import Graph from 'components/Graph';
import GridTableComponent from 'container/GridTableComponent';
import GridValueComponent from 'container/GridValueComponent';

import { PANEL_TYPES } from './queryBuilder';

export const PANEL_TYPES_COMPONENT_MAP = {
	[PANEL_TYPES.TIME_SERIES]: Graph,
	[PANEL_TYPES.VALUE]: GridValueComponent,
	[PANEL_TYPES.TABLE]: GridTableComponent,
	[PANEL_TYPES.TRACE]: null,
	[PANEL_TYPES.LIST]: null,
	[PANEL_TYPES.EMPTY_WIDGET]: null,
} as const;
