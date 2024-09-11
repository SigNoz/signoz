import { Select } from 'antd';
import { REDUCE_TO_VALUES } from 'constants/queryBuilder';
import { memo } from 'react';
// ** Types
import { ReduceOperators } from 'types/common/queryBuilder';
import { SelectOption } from 'types/common/select';

import { ReduceToFilterProps } from './ReduceToFilter.interfaces';

export const ReduceToFilter = memo(function ReduceToFilter({
	query,
	onChange,
}: ReduceToFilterProps): JSX.Element {
	const currentValue =
		REDUCE_TO_VALUES.find((option) => option.value === query.reduceTo) ||
		REDUCE_TO_VALUES[0];

	const handleChange = (
		newValue: SelectOption<ReduceOperators, string>,
	): void => {
		onChange(newValue.value);
	};

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
