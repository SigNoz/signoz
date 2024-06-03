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

type OnSelectType = Dispatch<SetStateAction<string>> | ((val: string) => void);
function YAxisUnitSelector({
	defaultValue,
	onSelect,
	fieldLabel,
	handleClear,
}: {
	defaultValue: string;
	onSelect: OnSelectType;
	fieldLabel: string;
	handleClear?: () => void;
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
				allowClear
				defaultValue={findCategoryById(defaultValue)?.name}
				onClear={handleClear}
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
				<Input placeholder="Unit" rootClassName="input" />
			</AutoComplete>
		</div>
	);
}

export default YAxisUnitSelector;

YAxisUnitSelector.defaultProps = {
	handleClear: (): void => {},
};
