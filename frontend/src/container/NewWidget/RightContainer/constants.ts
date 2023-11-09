import { DefaultOptionType } from 'antd/es/select';

import { flattenedCategories } from './dataFormatCategories';

// > >= < <=  are the options
export const operatorOptions: DefaultOptionType[] = [
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
	{ value: 'Text', label: 'Text' },
	{ value: 'Number', label: 'Number' },
	{ value: 'Percent', label: 'Percent' },
	{ value: 'Currency', label: 'Currency' },
	{ value: 'Date', label: 'Date' },
	{ value: 'Time', label: 'Time' },
	{ value: 'Date time', label: 'Date Time' },
	{ value: 'Duration', label: 'Duration' },
];
