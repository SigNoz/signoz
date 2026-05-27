import { Space } from 'antd';
import {
	ComboboxSimple,
	ComboboxSimpleGroup,
	ComboboxSimpleItem,
} from '@signozhq/ui/combobox';
import { Typography } from '@signozhq/ui/typography';
import { getCategorySelectOptionByName } from 'container/NewWidget/RightContainer/alertFomatCategories';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';

import { categoryToSupport } from './config';
import { selectStyles } from './styles';
import { IBuilderUnitsFilterProps } from './types';

function BuilderUnitsFilter({
	onChange,
	yAxisUnit,
}: IBuilderUnitsFilterProps): JSX.Element {
	const { currentQuery, handleOnUnitsChange } = useQueryBuilder();

	const selectedValue = yAxisUnit || currentQuery?.unit;

	const groups: ComboboxSimpleGroup[] = categoryToSupport.map((category) => ({
		heading: category,
		items: getCategorySelectOptionByName(category) as ComboboxSimpleItem[],
	}));

	const onChangeHandler = (value: string | string[]): void => {
		const stringValue = value as string;
		if (onChange) {
			onChange(stringValue);
		}

		handleOnUnitsChange(stringValue);
	};

	return (
		<Space className="builder-units-filter">
			<Typography.Text className="builder-units-filter-label">
				Y-axis unit
			</Typography.Text>
			<ComboboxSimple
				style={selectStyles}
				onChange={onChangeHandler}
				value={selectedValue || ''}
				groups={groups}
				placeholder="Select unit"
			/>
		</Space>
	);
}

export { BuilderUnitsFilter };
