import { AutoComplete, Input, Typography } from 'antd';
import { find } from 'lodash-es';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';

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
	value,
	onSelect,
	fieldLabel,
	handleClear,
}: {
	value: string;
	onSelect: OnSelectType;
	fieldLabel: string;
	handleClear?: () => void;
}): JSX.Element {
	const [inputValue, setInputValue] = useState('');

	// Sync input value with the actual value prop
	useEffect(() => {
		const category = findCategoryById(value);
		setInputValue(category?.name || '');
	}, [value]);

	const onSelectHandler = (selectedValue: string): void => {
		const category = findCategoryByName(selectedValue);
		if (category) {
			onSelect(category.id);
			setInputValue(selectedValue);
		}
	};

	const onChangeHandler = (inputValue: string): void => {
		setInputValue(inputValue);
		// Clear the yAxisUnit if input is empty or doesn't match any option
		if (!inputValue) {
			onSelect('');
		}
	};

	const onClearHandler = (): void => {
		setInputValue('');
		onSelect('');
		if (handleClear) {
			handleClear();
		}
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
				value={inputValue}
				onChange={onChangeHandler}
				onClear={onClearHandler}
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
