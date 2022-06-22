import { EAggregateOperator } from 'types/common/dashboard';

import { IOption } from './queryBuilder/MetricTagKeyFilter/types';

export const AggregateFunctions = Object.keys(EAggregateOperator)
	.filter((key) => isNaN(parseInt(key)))
	.map((key) => {
		return {
			label: key,
			value: EAggregateOperator[key],
		};
	});

export const TagKeyOperator = [
	{ label: 'In', value: 'IN' },
	{ label: 'Not In', value: 'NIN' },
	{ label: 'Like', value: 'LIKE' },
	{ label: 'Not Like', value: 'NLIKE' },
	// { label: 'Equal', value: 'EQ' },
	// { label: 'Not Equal', value: 'NEQ' },
	// { label: 'REGEX', value: 'REGEX' },
];
