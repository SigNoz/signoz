import { Select } from 'antd';
import React from 'react';
// ** Types
import { SelectOption } from 'types/common/select';
// ** Helpers
import { transformToUpperCase } from 'utils/transformToUpperCase';

import { OperatorsSelectProps } from './OperatorsSelect.interfaces';

export function OperatorsSelect({
	operators,
	value,
	onChange,
	...props
}: OperatorsSelectProps): JSX.Element {
	const operatorsOptions: SelectOption<string, string>[] = operators.map(
		(operator) => ({
			label: transformToUpperCase(operator),
			value: operator,
		}),
	);

	return (
		<Select
			options={operatorsOptions}
			value={value}
			onChange={onChange}
			// eslint-disable-next-line react/jsx-props-no-spreading
			{...props}
		/>
	);
}
