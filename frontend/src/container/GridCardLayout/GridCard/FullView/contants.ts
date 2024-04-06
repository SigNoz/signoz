import { PanelTypeAndGraphManagerVisibilityProps } from './types';

export enum ColumnsKeyAndDataIndex {
	Index = 'index',
	Legend = 'legend',
	Label = 'label',
	Avg = 'avg',
	Sum = 'sum',
	Max = 'max',
	Min = 'min',
}

export const ColumnsTitle = {
	[ColumnsKeyAndDataIndex.Index]: 'Index',
	[ColumnsKeyAndDataIndex.Label]: 'Label',
	[ColumnsKeyAndDataIndex.Avg]: 'Avg',
	[ColumnsKeyAndDataIndex.Sum]: 'Sum',
	[ColumnsKeyAndDataIndex.Max]: 'Max',
	[ColumnsKeyAndDataIndex.Min]: 'Min',
};

export const PANEL_TYPES_VS_FULL_VIEW_TABLE: PanelTypeAndGraphManagerVisibilityProps = {
	TIME_SERIES: true,
	VALUE: false,
	TABLE: false,
	LIST: false,
	TRACE: false,
	BAR: true,
	PIE: false,
	HISTOGRAM: false,
	EMPTY_WIDGET: false,
};
