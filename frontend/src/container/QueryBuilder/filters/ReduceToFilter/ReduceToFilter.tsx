import { memo, useEffect, useState } from 'react';
import { SelectSimple } from '@signozhq/ui/select';
import { REDUCE_TO_VALUES } from 'constants/queryBuilder';
import { MetricAggregation } from 'types/api/v5/queryRange';
// ** Types
import { ReduceOperators } from 'types/common/queryBuilder';

import { ReduceToFilterProps } from './ReduceToFilter.interfaces';

const REDUCE_TO_ITEMS = REDUCE_TO_VALUES.map((option) => ({
	value: option.value,
	label: option.label,
}));

export const ReduceToFilter = memo(function ReduceToFilter({
	query,
	onChange,
}: ReduceToFilterProps): JSX.Element {
	const [currentValue, setCurrentValue] = useState<ReduceOperators>(
		REDUCE_TO_VALUES[2].value,
	);

	const handleChange = (newValue: string | string[]): void => {
		const value = newValue as ReduceOperators;
		setCurrentValue(value);
		onChange(value);
	};

	useEffect(
		() => {
			const reduceToValue =
				(query.aggregations?.[0] as MetricAggregation)?.reduceTo || query.reduceTo;

			setCurrentValue(
				REDUCE_TO_VALUES.find((option) => option.value === reduceToValue)?.value ||
					REDUCE_TO_VALUES[2].value,
			);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[(query.aggregations?.[0] as MetricAggregation)?.reduceTo, query.reduceTo],
	);

	return (
		<SelectSimple
			placeholder="Reduce to"
			style={{ width: '100%' }}
			items={REDUCE_TO_ITEMS}
			value={currentValue}
			onChange={handleChange}
		/>
	);
});
