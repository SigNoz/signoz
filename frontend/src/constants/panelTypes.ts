import Uplot from 'components/Uplot';
import GridTableComponent from 'container/GridTableComponent';
import GridValueComponent from 'container/GridValueComponent';

import { PANEL_TYPES } from './queryBuilder';

export const PANEL_TYPES_COMPONENT_MAP = {
	[PANEL_TYPES.TIME_SERIES]: Uplot,
	[PANEL_TYPES.VALUE]: GridValueComponent,
	[PANEL_TYPES.TABLE]: GridTableComponent,
	[PANEL_TYPES.TRACE]: null,
	[PANEL_TYPES.LIST]: null,
	[PANEL_TYPES.EMPTY_WIDGET]: null,
} as const;

export const AVAILABLE_EXPORT_PANEL_TYPES = [
	PANEL_TYPES.TIME_SERIES,
	PANEL_TYPES.TABLE,
];
