import { DefaultOptionType } from 'antd/es/select';

import { flattenedCategories } from './dataFormatCategories';

// > >= < <=  are the options
export const valueSelect: DefaultOptionType[] = [
	{ value: '>', label: '>' },
	{ value: '>=', label: '>=' },
	{ value: '<', label: '<' },
	{ value: '<=', label: '<=' },
];

export const unitOptions = flattenedCategories.map((options) => ({
	value: options.name,
	label: options.name,
}));

export const formatOptions: DefaultOptionType[] = [
	{ value: 'text', label: 'Text' },
	{ value: 'number', label: 'Number' },
	{ value: 'percent', label: 'Percent' },
	{ value: 'currency', label: 'Currency' },
	{ value: 'date', label: 'Date' },
	{ value: 'time', label: 'Time' },
	{ value: 'date-time', label: 'Date Time' },
	{ value: 'duration', label: 'Duration' },
];
