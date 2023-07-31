import { Select } from 'antd';
import { memo } from 'react';

// ** Types
import { selectStyle } from '../QueryBuilderSearch/config';
import { OperatorsSelectProps } from './OperatorsSelect.interfaces';

export const OperatorsSelect = memo(function OperatorsSelect({
	operators,
	value,
	onChange,
	...props
}: OperatorsSelectProps): JSX.Element {
	return (
		<Select
			options={operators}
			value={value}
			onChange={onChange}
			style={selectStyle}
			showSearch
			// eslint-disable-next-line react/jsx-props-no-spreading
			{...props}
		/>
	);
});
