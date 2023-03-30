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
	const [isMenuOpen, setMenuOpen] = useState<boolean>(false);

	const { data, isFetching } = useQuery(
		[
			'GET_ATTRIBUTE_KEY',
			searchText,
			query.dataSource,
			query.aggregateOperator,
			query.aggregateAttribute,
		],
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

	const handleDropdownOpen = (open: boolean): void => setMenuOpen(open);

	const tagRender = (props: CustomTagProps): React.ReactElement => (
		<span>{props.label}</span>
	);

	return (
		<Select
			allowClear
			mode="tags"
			open={isMenuOpen}
			showArrow={false}
			style={filterSelectStyle}
			placeholder="Type your Query"
			options={optionsData}
			optionFilterProp="label"
			onChange={handleChange}
			onSearch={handleSearch}
			tagRender={tagRender}
			onDropdownVisibleChange={handleDropdownOpen}
			notFoundContent={isFetching ? <Spin size="small" /> : null}
		/>
	);
}

interface SearchFiltersProps {
	query: IBuilderQuery;
}

type CustomTagProps = {
	label: React.ReactNode;
	value: unknown;
	disabled: boolean;
	onClose: (event?: React.MouseEvent<HTMLElement, MouseEvent>) => void;
	closable: boolean;
};
