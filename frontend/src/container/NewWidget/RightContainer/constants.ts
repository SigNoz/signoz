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
	value: options.id,
	label: options.name,
}));

export const showAsOptions: DefaultOptionType[] = [
	{ value: 'Text', label: 'Text' },
	{ value: 'Background', label: 'Background' },
];
