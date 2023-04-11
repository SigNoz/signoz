import { Select } from 'antd';
import React, { memo } from 'react';
// ** Types
import { EReduceOperator } from 'types/common/queryBuilder';
import { SelectOption } from 'types/common/select';

import { ReduceToFilterProps } from './ReduceToFilter.interfaces';

export const ReduceToFilter = memo(function ReduceToFilter({
	query,
	onChange,
}: ReduceToFilterProps): JSX.Element {
	const options: SelectOption<string, string>[] = Object.values(
		EReduceOperator,
	).map((str) => ({ label: str, value: str }));

	return (
		<Select
			placeholder="Reduce to"
			style={{ width: '100%' }}
			options={options}
			value={query.reduceTo}
			onChange={onChange}
		/>
	);
});
