import { EAggregateOperator } from 'types/common/dashboard';

export const AggregateFunctions = Object.keys(EAggregateOperator)
	.filter((key) => Number.isNaN(parseInt(key, 10)))
	.map((key) => {
		return {
			label: key,
			value: EAggregateOperator[key as keyof typeof EAggregateOperator],
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
