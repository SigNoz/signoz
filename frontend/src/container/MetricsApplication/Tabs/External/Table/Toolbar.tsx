import { Card, Input, Radio, Space } from 'antd';
import React from 'react';

import { ReduceTo } from './reduceTo';

export type FilterDropdownProps = {
	addressFilter: string;
	onAddressFilterChange: (v: string) => void;
	reduceTo: ReduceTo;
	onReduceToChange: (v: ReduceTo) => void;
};

function FilterDropdown(props: FilterDropdownProps): JSX.Element {
	const {
		addressFilter,
		onAddressFilterChange,
		reduceTo,
		onReduceToChange,
	} = props;

	return (
		<Card size="small">
			<Space
				align="start"
				direction="horizontal"
				style={{ width: '100%', justifyContent: 'space-between' }}
			>
				<Input
					placeholder="Search by address"
					value={addressFilter}
					onChange={(e): void => onAddressFilterChange(e.target.value)}
					allowClear
				/>

				<Radio.Group
					value={reduceTo}
					onChange={(e): void => onReduceToChange(e.target.value)}
					size="middle"
				>
					<Radio.Button value="min">min</Radio.Button>
					<Radio.Button value="max">max</Radio.Button>
					<Radio.Button value="avg">avg</Radio.Button>
					<Radio.Button value="p50">p50</Radio.Button>
					<Radio.Button value="p90">p90</Radio.Button>
					<Radio.Button value="p95">p95</Radio.Button>
					<Radio.Button value="p99">p99</Radio.Button>
					<Radio.Button value="latest">latest</Radio.Button>
				</Radio.Group>
			</Space>
		</Card>
	);
}

export default FilterDropdown;
