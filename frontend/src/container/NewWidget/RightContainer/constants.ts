import { DefaultOptionType } from 'antd/es/select';
import { categoryToSupport } from 'container/QueryBuilder/filters/BuilderUnitsFilter/config';

import { getCategorySelectOptionByName } from './alertFomatCategories';

// > >= < <=  are the options
export const operatorOptions: DefaultOptionType[] = [
	{ value: '>', label: '>' },
	{ value: '>=', label: '>=' },
	{ value: '<', label: '<' },
	{ value: '<=', label: '<=' },
];

// export const unitOptions = flattenedCategories.map((options) => ({
// 	value: options.id,
// 	label: options.name,
// }));

export const unitOptions = categoryToSupport.map((category) => ({
	label: category,
	options: getCategorySelectOptionByName(category),
}));

export const showAsOptions: DefaultOptionType[] = [
	{ value: 'Text', label: 'Text' },
	{ value: 'Background', label: 'Background' },
];
