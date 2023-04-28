import { Card, Input, Radio, Space } from 'antd';
import React from 'react';

import { ReduceToVariant, reduceToVariants } from './reduceTo';

export type FilterDropdownProps = {
	addressFilter: string;
	onAddressFilterChange: (v: string) => void;
	reduceTo: ReduceToVariant;
	onReduceToChange: (v: ReduceToVariant) => void;
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
					{reduceToVariants.map((v) => (
						<Radio.Button key={v} value={v}>
							{v}
						</Radio.Button>
					))}
				</Radio.Group>
			</Space>
		</Card>
	);
}

export default FilterDropdown;
