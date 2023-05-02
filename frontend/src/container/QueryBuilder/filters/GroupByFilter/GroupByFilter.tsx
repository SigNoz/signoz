import { Select, Spin } from 'antd';
import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
// ** Constants
import { QueryBuilderKeys } from 'constants/queryBuilder';
// ** Components
// ** Helpers
import { transformStringWithPrefix } from 'lib/query/transformStringWithPrefix';
import React, { memo, useState } from 'react';
import { useQuery } from 'react-query';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { SelectOption } from 'types/common/select';

import { selectStyle } from '../QueryBuilderSearch/config';
import {
	GroupByFilterProps,
	GroupByFilterValue,
} from './GroupByFilter.interfaces';

export const GroupByFilter = memo(function GroupByFilter({
	query,
	onChange,
	disabled,
}: GroupByFilterProps): JSX.Element {
	const [searchText, setSearchText] = useState<string>('');
	const [isFocused, setIsFocused] = useState<boolean>(false);

	const { data, isFetching } = useQuery(
		[QueryBuilderKeys.GET_AGGREGATE_KEYS, searchText, isFocused],
		async () =>
			getAggregateKeys({
				aggregateAttribute: query.aggregateAttribute.key,
				dataSource: query.dataSource,
				aggregateOperator: query.aggregateOperator,
				searchText,
			}),
		{ enabled: !disabled && isFocused, keepPreviousData: true },
	);

	const handleSearchKeys = (searchText: string): void => {
		setSearchText(searchText);
	};

	const onBlur = (): void => {
		setIsFocused(false);
	};

	const onFocus = (): void => {
		setIsFocused(true);
	};

	const optionsData: SelectOption<string, string>[] =
		data?.payload?.attributeKeys?.map((item) => ({
			label: transformStringWithPrefix({
				str: item.key,
				prefix: item.type || '',
				condition: !item.isColumn,
			}),
			value: item.key,
		})) || [];

	const handleChange = (values: GroupByFilterValue[]): void => {
		const groupByValues: BaseAutocompleteData[] = values.map((item) => {
			const responseKeys = data?.payload?.attributeKeys || [];
			const existGroupResponse = responseKeys.find(
				(group) => group.key === item.value,
			);
			if (existGroupResponse) {
				return existGroupResponse;
			}

			const existGroupQuery = query.groupBy.find(
				(group) => group.key === item.value,
			);

			if (existGroupQuery) {
				return existGroupQuery;
			}

			return {
				isColumn: null,
				key: item.value,
				dataType: null,
				type: null,
			};
		});

		setSearchText('');
		onChange(groupByValues);
	};

	const values: GroupByFilterValue[] = query.groupBy.map((item) => ({
		label: transformStringWithPrefix({
			str: item.key,
			prefix: item.type || '',
			condition: !item.isColumn,
		}),
		key: item.key,
		value: item.key,
		disabled: undefined,
		title: undefined,
	}));

	return (
		<Select
			mode="tags"
			style={selectStyle}
			onSearch={handleSearchKeys}
			showSearch
			disabled={disabled}
			showArrow={false}
			onBlur={onBlur}
			onFocus={onFocus}
			filterOption={false}
			options={optionsData}
			labelInValue
			value={values}
			notFoundContent={isFetching ? <Spin size="small" /> : null}
			onChange={handleChange}
		/>
	);
});
