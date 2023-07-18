import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';

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

export const ShowGraphManager: {
	[key in GRAPH_TYPES]: boolean;
} = {
	graph: true,
	value: false,
	table: false,
	EMPTY_WIDGET: false,
	list: false,
	trace: false,
};
