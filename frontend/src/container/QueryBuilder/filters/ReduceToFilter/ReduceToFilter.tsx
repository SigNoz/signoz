import { Select } from 'antd';
import { REDUCE_TO_VALUES } from 'constants/queryBuilder';
import { memo, useEffect, useState } from 'react';
import { MetricAggregation } from 'types/api/v5/queryRange';
// ** Types
import { ReduceOperators } from 'types/common/queryBuilder';
import { SelectOption } from 'types/common/select';

import { ReduceToFilterProps } from './ReduceToFilter.interfaces';

export const ReduceToFilter = memo(function ReduceToFilter({
	query,
	onChange,
}: ReduceToFilterProps): JSX.Element {
	const [currentValue, setCurrentValue] = useState<
		SelectOption<ReduceOperators, string>
	>();

	const handleChange = (
		newValue: SelectOption<ReduceOperators, string>,
	): void => {
		setCurrentValue(newValue);
		onChange(newValue.value);
	};

	useEffect(() => {
		const reduceToValue =
			(query.aggregations?.[0] as MetricAggregation)?.reduceTo || query.reduceTo;

		const findReduceToValue =
			REDUCE_TO_VALUES.find((option) => option.value === reduceToValue) ||
			REDUCE_TO_VALUES.find((option) => option.value === ReduceOperators.AVG);

		setCurrentValue(findReduceToValue);
	}, [query.aggregations, query.reduceTo]);

	return (
		<Select
			placeholder="Reduce to"
			style={{ width: '100%' }}
			options={REDUCE_TO_VALUES}
			value={currentValue}
			data-testid="reduce-to"
			labelInValue
			onChange={handleChange}
		/>
	);
});
