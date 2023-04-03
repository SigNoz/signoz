import { Select, Spin } from 'antd';
import {
	AttributeKeyOptions,
	getAttributesKeys,
} from 'api/queryBuilder/getAttributesKeysValues';
import React, { useCallback, useState } from 'react';
import { useQuery } from 'react-query';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import { filterSelectStyle } from './config';

export function SearchFilters({ query }: SearchFiltersProps): JSX.Element {
	const [currentState, setCurrentState] = useState<string>('tagKey');
	const [searchText, setSearchText] = useState<string>('');

	const { data, isFetching } = useQuery(
		['GET_ATTRIBUTE_KEY', searchText],
		async () =>
			getAttributesKeys({
				searchText,
				dataSource: query.dataSource,
				aggregateOperator: query.aggregateOperator,
				aggregateAttribute: query.aggregateAttribute,
			}),
		{
			enabled:
				!!query.dataSource &&
				!!query.aggregateOperator &&
				!!query.aggregateAttribute,
		},
	);

	const handleChange = useCallback(
		(value: string[]): void => {
			console.log(`selected ${value}`);
			if (currentState === 'tagKey') {
				setCurrentState('tagOperator');
			}
			if (currentState === 'tagOperator') {
				setCurrentState('tagValue');
			}
			if (currentState === 'tagValues') {
				setCurrentState('');
			}
		},
		[currentState],
	);

	const optionsData =
		data?.payload?.data.attributeKeys?.map((item: AttributeKeyOptions) => ({
			label: item.key,
			value: item.key,
		})) || [];

	const handleSearch = (e: React.SetStateAction<string>): void =>
		setSearchText(e);

	return (
		<Select
			allowClear
			showSearch
			autoFocus
			mode="tags"
			showArrow={false}
			style={filterSelectStyle}
			placeholder="Type your Query"
			options={optionsData}
			optionFilterProp="label"
			onChange={handleChange}
			onSearch={handleSearch}
			notFoundContent={isFetching ? <Spin size="small" /> : null}
		/>
	);
}

interface SearchFiltersProps {
	query: IBuilderQuery;
}
