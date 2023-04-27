import { Card, Input, Space } from 'antd';
import React from 'react';

export type FilterDropdownProps = {
	value: string;
	onChange: (v: string) => void;
};

function FilterDropdown(props: FilterDropdownProps): JSX.Element {
	const { value, onChange } = props;

	return (
		<Card size="small">
			<Space align="start" direction="vertical">
				<Input
					placeholder="Search by address"
					value={value}
					onChange={(e): void => onChange(e.target.value)}
					allowClear
				/>
			</Space>
		</Card>
	);
}

export default FilterDropdown;
