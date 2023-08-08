import { Select, Space } from 'antd';
import { getCategorySelectOptionByName } from 'container/NewWidget/RightContainer/dataFormatCategories';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';

import { categoryToSupport } from './config';
import { DefaultLabel, selectStyles } from './styles';

function BuilderUnitsFilter(): JSX.Element {
	const { currentQuery, handleOnUnitsChange } = useQueryBuilder();

	const selectedValue = currentQuery?.unit;

	const allOptions = categoryToSupport.map((category) => ({
		label: category,
		options: getCategorySelectOptionByName(category),
	}));

	return (
		<Space>
			<DefaultLabel>Y-axis unit</DefaultLabel>
			<Select
				style={selectStyles}
				onChange={handleOnUnitsChange}
				value={selectedValue}
				options={allOptions}
				placeholder="Select unit"
			/>
		</Space>
	);
}

export { BuilderUnitsFilter };
