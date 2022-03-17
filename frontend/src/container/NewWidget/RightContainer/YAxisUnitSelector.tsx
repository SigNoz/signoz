import { AutoComplete, Col, Input, Typography } from 'antd';
import { find } from 'lodash-es';
import React from 'react';

import { flattenedCategories } from './dataFormatCategories';

const findCategoryById = (searchValue) =>
	find(flattenedCategories, (option) => option.id == searchValue);
const findCategoryByName = (searchValue) =>
	find(flattenedCategories, (option) => option.name == searchValue);

const YAxisUnitSelector = ({ defaultValue, onSelect }): JSX.Element => {
	const onSelectHandler = (selectedValue: string): void => {
		onSelect(findCategoryByName(selectedValue)?.id);
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
				filterOption={(inputValue, option): boolean =>
					option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
				}
			>
				<Input size="large" placeholder="Unit" allowClear />
			</AutoComplete>
		</Col>
	);
};

export default YAxisUnitSelector;
