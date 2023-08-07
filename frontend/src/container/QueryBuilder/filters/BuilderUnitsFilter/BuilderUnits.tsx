import { Select, Space } from 'antd';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';

import { DefaultLabel, selectStyles } from './styles';
import { getAllUnits } from './utils';

function BuilderUnitsFilter(): JSX.Element {
	const { currentQuery, handleOnUnitsChange } = useQueryBuilder();

	const selectedValue = currentQuery?.unit;

	return (
		<Space>
			<DefaultLabel>Y-axis unit</DefaultLabel>
			<Select
				style={selectStyles}
				onChange={handleOnUnitsChange}
				value={selectedValue}
				options={getAllUnits}
				placeholder="Select unit"
			/>
		</Space>
	);
}

export { BuilderUnitsFilter };
