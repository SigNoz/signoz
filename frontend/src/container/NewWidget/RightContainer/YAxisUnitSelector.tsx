import type { SelectProps } from 'antd';
import { AutoComplete, Col, Input, Typography } from 'antd';
import { DefaultOptionType } from 'antd/lib/select';
import { find } from 'lodash-es';
import React from 'react';

import { flattenedCategories } from './dataFormatCategories';

interface SearchValue {
	name: string;
	id: string;
}

const findCategoryById = (searchValue: string): SearchValue | undefined =>
	find(flattenedCategories, (option) => option.id == searchValue);

const findCategoryByName = (searchValue: string): SearchValue | undefined =>
	find(flattenedCategories, (option) => option.name === searchValue);

const YAxisUnitSelector = ({
	defaultValue,
	onSelect,
}: YAxisUnitSelectorProps): JSX.Element => {
	const onSelectHandler = (selectedValue: string): void => {
		if (onSelect) {
			onSelect(
				findCategoryByName(selectedValue)?.id || '',
				{} as DefaultOptionType,
			);
		}
	};

	const options = flattenedCategories.map((options) => ({
		value: options.name,
	}));

	return (
		<Col style={{ marginTop: '1rem' }}>
			<div style={{ margin: '0.5rem 0' }}>
				<Typography.Text>Y Axis Unit</Typography.Text>
			</div>
			<AutoComplete
				style={{ width: '100%' }}
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
				<Input size="large" placeholder="Unit" allowClear />
			</AutoComplete>
		</Col>
	);
};

interface YAxisUnitSelectorProps {
	defaultValue: string;
	onSelect: SelectProps['onSelect'];
}

export default YAxisUnitSelector;
