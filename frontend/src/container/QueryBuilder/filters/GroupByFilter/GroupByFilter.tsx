import { Select, Spin } from 'antd';
import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
// ** Constants
import { QueryBuilderKeys } from 'constants/queryBuilder';
// ** Components
// ** Helpers
import { transformStringWithPrefix } from 'lib/query/transformStringWithPrefix';
import React, { memo, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { MetricAggregateOperator } from 'types/common/queryBuilder';
import { SelectOption } from 'types/common/select';

import { selectStyle } from '../QueryBuilderSearch/config';
import {
	GroupByFilterProps,
	GroupByFilterValue,
} from './GroupByFilter.interfaces';

export const GroupByFilter = memo(function GroupByFilter({
	query,
	onChange,
}: GroupByFilterProps): JSX.Element {
	const [searchText, setSearchText] = useState<string>('');

	const { data, isFetching } = useQuery(
		[QueryBuilderKeys.GET_AGGREGATE_KEYS, searchText],
		async () =>
			getAggregateKeys({
				aggregateAttribute: query.aggregateAttribute.key,
				tagType: query.aggregateAttribute.type,
				dataSource: query.dataSource,
				aggregateOperator: query.aggregateOperator,
				searchText,
			}),
		{ enabled: !!query.aggregateAttribute.key, keepPreviousData: true },
	);

	const handleSearchKeys = (searchText: string): void => {
		setSearchText(searchText);
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
			const iterationArray = data?.payload?.attributeKeys || query.groupBy;
			const existGroup = iterationArray.find((group) => group.key === item.value);
			if (existGroup) {
				return existGroup;
			}

			return {
				isColumn: null,
				key: item.value,
				dataType: null,
				type: null,
			};
		});

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

	const isDisabledSelect = useMemo(
		() =>
			!query.aggregateAttribute.key ||
			query.aggregateOperator === MetricAggregateOperator.NOOP,
		[query.aggregateAttribute.key, query.aggregateOperator],
	);

	return (
		<Select
			mode="tags"
			style={selectStyle}
			onSearch={handleSearchKeys}
			showSearch
			disabled={isDisabledSelect}
			showArrow={false}
			filterOption={false}
			options={optionsData}
			labelInValue
			value={values}
			notFoundContent={isFetching ? <Spin size="small" /> : null}
			onChange={handleChange}
		/>
	);
});
