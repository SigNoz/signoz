import { PanelTypeAndGraphManagerVisibilityProps } from './types';

export enum ColumnsTitle {
	Index = 'Index',
	Legend = 'Legend',
	Label = 'Label',
	Avg = 'Avg',
	Sum = 'Sum',
	Max = 'Max',
	Min = 'Min',
}

export const DataIndexAndKey = {
	[ColumnsTitle.Index]: 'index',
	[ColumnsTitle.Label]: 'label',
	[ColumnsTitle.Avg]: 'avg',
	[ColumnsTitle.Sum]: 'sum',
	[ColumnsTitle.Max]: 'max',
	[ColumnsTitle.Min]: 'min',
};

export const PANEL_TYPES_VS_FULL_VIEW_TABLE: PanelTypeAndGraphManagerVisibilityProps = {
	TIME_SERIES: true,
	VALUE: false,
	TABLE: false,
	LIST: false,
	TRACE: false,
	EMPTY_WIDGET: false,
};
