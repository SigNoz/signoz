import { AutoComplete, Input, Typography } from 'antd';
import { find } from 'lodash-es';
import { Dispatch, SetStateAction } from 'react';

import { flattenedCategories } from './dataFormatCategories';

const findCategoryById = (
	searchValue: string,
): Record<string, string> | undefined =>
	find(flattenedCategories, (option) => option.id === searchValue);
const findCategoryByName = (
	searchValue: string,
): Record<string, string> | undefined =>
	find(flattenedCategories, (option) => option.name === searchValue);

function YAxisUnitSelector({
	defaultValue,
	onSelect,
	fieldLabel,
}: {
	defaultValue: string;
	onSelect: Dispatch<SetStateAction<string>>;
	fieldLabel: string;
}): JSX.Element {
	const onSelectHandler = (selectedValue: string): void => {
		onSelect(findCategoryByName(selectedValue)?.id || '');
	};
	const options = flattenedCategories.map((options) => ({
		value: options.name,
	}));
	return (
		<div className="y-axis-unit-selector">
			<Typography.Text className="heading">{fieldLabel}</Typography.Text>
			<AutoComplete
				style={{ width: '100%' }}
				rootClassName="y-axis-root-popover"
				options={options}
				defaultValue={findCategoryById(defaultValue)?.name}
				onSelect={onSelectHandler}
				filterOption={(inputValue, option): boolean => {
					if (option) {
						return (
							option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
						);
					}
					return false;
				}}
			>
				<Input placeholder="Unit" allowClear rootClassName="input" />
			</AutoComplete>
		</div>
	);
}

export default YAxisUnitSelector;
