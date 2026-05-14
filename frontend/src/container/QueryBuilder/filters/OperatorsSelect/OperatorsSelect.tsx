import { memo } from 'react';
import { Select } from 'antd';

// ** Types
import { selectStyle } from '../QueryBuilderSearch/config';
import { OperatorsSelectProps } from './OperatorsSelect.interfaces';

export const OperatorsSelect = memo(function OperatorsSelect({
	operators,
	value,
	onChange,
	className,
	...props
}: OperatorsSelectProps): JSX.Element {
	return (
		<Select
			options={operators}
			value={value}
			onChange={onChange}
			style={selectStyle}
			showSearch
			{...props}
			popupClassName={className}
		/>
	);
});
