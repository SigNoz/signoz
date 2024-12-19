import { DefaultOptionType } from 'antd/es/select';
import { PANEL_TYPES } from 'constants/queryBuilder';

export const operatorOptions: DefaultOptionType[] = [
	{ value: '>', label: '>' },
	{ value: '>=', label: '>=' },
	{ value: '<', label: '<' },
	{ value: '<=', label: '<=' },
];

export const showAsOptions: DefaultOptionType[] = [
	{ value: 'Text', label: 'Text' },
	{ value: 'Background', label: 'Background' },
];

export const panelTypeVsThreshold: { [key in PANEL_TYPES]: boolean } = {
	[PANEL_TYPES.TIME_SERIES]: true,
	[PANEL_TYPES.VALUE]: true,
	[PANEL_TYPES.TABLE]: true,
	[PANEL_TYPES.LIST]: false,
	[PANEL_TYPES.PIE]: false,
	[PANEL_TYPES.BAR]: true,
	[PANEL_TYPES.HISTOGRAM]: false,
	[PANEL_TYPES.TRACE]: false,
	[PANEL_TYPES.EMPTY_WIDGET]: false,
} as const;

export const panelTypeVsSoftMinMax: { [key in PANEL_TYPES]: boolean } = {
	[PANEL_TYPES.TIME_SERIES]: true,
	[PANEL_TYPES.VALUE]: false,
	[PANEL_TYPES.TABLE]: false,
	[PANEL_TYPES.LIST]: false,
	[PANEL_TYPES.PIE]: false,
	[PANEL_TYPES.BAR]: true,
	[PANEL_TYPES.HISTOGRAM]: false,
	[PANEL_TYPES.TRACE]: false,
	[PANEL_TYPES.EMPTY_WIDGET]: false,
} as const;

export const panelTypeVsDragAndDrop: { [key in PANEL_TYPES]: boolean } = {
	[PANEL_TYPES.TIME_SERIES]: false,
	[PANEL_TYPES.VALUE]: true,
	[PANEL_TYPES.TABLE]: true,
	[PANEL_TYPES.PIE]: false,
	[PANEL_TYPES.LIST]: false,
	[PANEL_TYPES.BAR]: false,
	[PANEL_TYPES.HISTOGRAM]: false,
	[PANEL_TYPES.TRACE]: false,
	[PANEL_TYPES.EMPTY_WIDGET]: false,
} as const;

export const panelTypeVsFillSpan: { [key in PANEL_TYPES]: boolean } = {
	[PANEL_TYPES.TIME_SERIES]: true,
	[PANEL_TYPES.VALUE]: false,
	[PANEL_TYPES.TABLE]: false,
	[PANEL_TYPES.LIST]: false,
	[PANEL_TYPES.PIE]: false,
	[PANEL_TYPES.BAR]: false,
	[PANEL_TYPES.HISTOGRAM]: false,
	[PANEL_TYPES.TRACE]: false,
	[PANEL_TYPES.EMPTY_WIDGET]: false,
} as const;

export const panelTypeVsYAxisUnit: { [key in PANEL_TYPES]: boolean } = {
	[PANEL_TYPES.TIME_SERIES]: true,
	[PANEL_TYPES.VALUE]: true,
	[PANEL_TYPES.TABLE]: false,
	[PANEL_TYPES.LIST]: false,
	[PANEL_TYPES.PIE]: true,
	[PANEL_TYPES.BAR]: true,
	[PANEL_TYPES.HISTOGRAM]: false,
	[PANEL_TYPES.TRACE]: false,
	[PANEL_TYPES.EMPTY_WIDGET]: false,
} as const;

export const panelTypeVsCreateAlert: { [key in PANEL_TYPES]: boolean } = {
	[PANEL_TYPES.TIME_SERIES]: true,
	[PANEL_TYPES.VALUE]: true,
	[PANEL_TYPES.TABLE]: false,
	[PANEL_TYPES.LIST]: false,
	[PANEL_TYPES.PIE]: false,
	[PANEL_TYPES.BAR]: true,
	[PANEL_TYPES.HISTOGRAM]: false,
	[PANEL_TYPES.TRACE]: false,
	[PANEL_TYPES.EMPTY_WIDGET]: false,
} as const;

export const panelTypeVsBucketConfig: { [key in PANEL_TYPES]: boolean } = {
	[PANEL_TYPES.TIME_SERIES]: false,
	[PANEL_TYPES.VALUE]: false,
	[PANEL_TYPES.TABLE]: false,
	[PANEL_TYPES.LIST]: false,
	[PANEL_TYPES.PIE]: false,
	[PANEL_TYPES.BAR]: false,
	[PANEL_TYPES.HISTOGRAM]: true,
	[PANEL_TYPES.TRACE]: false,
	[PANEL_TYPES.EMPTY_WIDGET]: false,
} as const;

export const panelTypeVsPanelTimePreferences: {
	[key in PANEL_TYPES]: boolean;
} = {
	[PANEL_TYPES.TIME_SERIES]: true,
	[PANEL_TYPES.VALUE]: true,
	[PANEL_TYPES.TABLE]: true,
	[PANEL_TYPES.LIST]: false,
	[PANEL_TYPES.PIE]: true,
	[PANEL_TYPES.BAR]: true,
	[PANEL_TYPES.HISTOGRAM]: false,
	[PANEL_TYPES.TRACE]: false,
	[PANEL_TYPES.EMPTY_WIDGET]: false,
} as const;

export const panelTypeVsColumnUnitPreferences: {
	[key in PANEL_TYPES]: boolean;
} = {
	[PANEL_TYPES.TIME_SERIES]: false,
	[PANEL_TYPES.VALUE]: false,
	[PANEL_TYPES.TABLE]: true,
	[PANEL_TYPES.LIST]: false,
	[PANEL_TYPES.PIE]: false,
	[PANEL_TYPES.BAR]: false,
	[PANEL_TYPES.TRACE]: false,
	[PANEL_TYPES.HISTOGRAM]: false,
	[PANEL_TYPES.EMPTY_WIDGET]: false,
} as const;

export const panelTypeVsStackingChartPreferences: {
	[key in PANEL_TYPES]: boolean;
} = {
	[PANEL_TYPES.TIME_SERIES]: false,
	[PANEL_TYPES.VALUE]: false,
	[PANEL_TYPES.TABLE]: false,
	[PANEL_TYPES.LIST]: false,
	[PANEL_TYPES.PIE]: false,
	[PANEL_TYPES.BAR]: true,
	[PANEL_TYPES.TRACE]: false,
	[PANEL_TYPES.HISTOGRAM]: false,
	[PANEL_TYPES.EMPTY_WIDGET]: false,
} as const;
