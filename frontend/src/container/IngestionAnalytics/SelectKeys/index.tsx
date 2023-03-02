import type { SelectProps } from 'antd';
import { Select } from 'antd';
import React from 'react';

const options: SelectProps['options'] = [];
for (let i = 10; i < 36; i += 1) {
	options.push({
		label: i.toString(36) + i,
		value: i.toString(36) + i,
	});
}

const handleChange = (value: string[]): void => {
	console.log(`selected ${value}`);
};

function SelectKeys(): JSX.Element {
	return (
		<Select
			mode="multiple"
			allowClear
			style={{ width: '100%' }}
			placeholder="Please select"
			defaultValue={['a10', 'c12']}
			onChange={handleChange}
			options={options}
		/>
	);
}

export default SelectKeys;
