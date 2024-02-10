import { DefaultOptionType } from 'antd/es/select';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { categoryToSupport } from 'container/QueryBuilder/filters/BuilderUnitsFilter/config';

import { getCategorySelectOptionByName } from './alertFomatCategories';

export const operatorOptions: DefaultOptionType[] = [
	{ value: '>', label: '>' },
	{ value: '>=', label: '>=' },
	{ value: '<', label: '<' },
	{ value: '<=', label: '<=' },
];

export const unitOptions = categoryToSupport.map((category) => ({
	label: category,
	options: getCategorySelectOptionByName(category),
}));

export const showAsOptions: DefaultOptionType[] = [
	{ value: 'Text', label: 'Text' },
	{ value: 'Background', label: 'Background' },
];

export const panelTypeVsThreshold: { [key in PANEL_TYPES]: boolean } = {
	[PANEL_TYPES.TIME_SERIES]: true,
	[PANEL_TYPES.VALUE]: true,
	[PANEL_TYPES.TABLE]: true,
	[PANEL_TYPES.LIST]: false,
	[PANEL_TYPES.TRACE]: false,
	[PANEL_TYPES.EMPTY_WIDGET]: false,
} as const;

export const panelTypeVsSoftMinMax: { [key in PANEL_TYPES]: boolean } = {
	[PANEL_TYPES.TIME_SERIES]: true,
	[PANEL_TYPES.VALUE]: false,
	[PANEL_TYPES.TABLE]: false,
	[PANEL_TYPES.LIST]: false,
	[PANEL_TYPES.TRACE]: false,
	[PANEL_TYPES.EMPTY_WIDGET]: false,
} as const;

export const panelTypeVsDragAndDrop: { [key in PANEL_TYPES]: boolean } = {
	[PANEL_TYPES.TIME_SERIES]: false,
	[PANEL_TYPES.VALUE]: true,
	[PANEL_TYPES.TABLE]: true,
	[PANEL_TYPES.LIST]: false,
	[PANEL_TYPES.TRACE]: false,
	[PANEL_TYPES.EMPTY_WIDGET]: false,
} as const;
