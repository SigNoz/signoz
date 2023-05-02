import { Select, Spin } from 'antd';
import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
import { QueryBuilderKeys } from 'constants/queryBuilder';
import { transformStringWithPrefix } from 'lib/query/transformStringWithPrefix';
import React, { useCallback, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { MetricAggregateOperator } from 'types/common/queryBuilder';

import { selectStyle } from '../QueryBuilderSearch/config';
import {
	OrderByFilterProps,
	OrderByFilterValue,
} from './OrderByFilter.interfaces';
import { getLabelFromValue, mapLabelValuePairs } from './utils';

export function OrderByFilter({
	query,
	onChange,
}: OrderByFilterProps): JSX.Element {
	const [searchText, setSearchText] = useState<string>('');
	const [selectedValue, setSelectedValue] = useState<OrderByFilterValue[]>([]);

	const { data, isFetching } = useQuery(
		[QueryBuilderKeys.GET_AGGREGATE_KEYS, searchText],
		async () =>
			getAggregateKeys({
				aggregateAttribute: query.aggregateAttribute.key,
				dataSource: query.dataSource,
				aggregateOperator: query.aggregateOperator,
				searchText,
			}),
		{ enabled: !!query.aggregateAttribute.key, keepPreviousData: true },
	);

	const handleSearchKeys = useCallback(
		(searchText: string): void => setSearchText(searchText),
		[],
	);

	const noAggregationOptions = useMemo(
		() =>
			data?.payload?.attributeKeys
				? mapLabelValuePairs(data?.payload?.attributeKeys)
						.flat()
						.filter(
							(option) =>
								!getLabelFromValue(selectedValue).includes(option.label.split(' ')[0]),
						)
				: [],
		[data?.payload?.attributeKeys, selectedValue],
	);

	const aggregationOptions = useMemo(
		() =>
			mapLabelValuePairs(query.groupBy)
				.flat()
				.concat([
					{
						label: `${query.aggregateOperator}(${query.aggregateAttribute.key}) asc`,
						value: `${query.aggregateOperator}(${query.aggregateAttribute.key}) asc`,
					},
					{
						label: `${query.aggregateOperator}(${query.aggregateAttribute.key}) desc`,
						value: `${query.aggregateOperator}(${query.aggregateAttribute.key}) desc`,
					},
				])
				.filter(
					(option) =>
						!getLabelFromValue(selectedValue).includes(option.label.split(' ')[0]),
				),
		[
			query.aggregateAttribute.key,
			query.aggregateOperator,
			query.groupBy,
			selectedValue,
		],
	);

	const optionsData = useMemo(
		() =>
			query.aggregateOperator === MetricAggregateOperator.NOOP
				? noAggregationOptions
				: aggregationOptions,
		[aggregationOptions, noAggregationOptions, query.aggregateOperator],
	);

	const handleChange = (values: OrderByFilterValue[]): void => {
		setSelectedValue(values);
		const orderByValues: BaseAutocompleteData[] = values?.map((item) => {
			const iterationArray = data?.payload?.attributeKeys || query.orderBy;
			const existingOrderValues = iterationArray.find(
				(group) => group.key === item.value,
			);
			if (existingOrderValues) {
				return existingOrderValues;
			}

			return {
				isColumn: null,
				key: item.value,
				dataType: null,
				type: null,
			};
		});
		onChange(orderByValues);
	};

	const values: OrderByFilterValue[] = useMemo(
		() =>
			query.orderBy
				.filter((order) =>
					query.groupBy.find(
						(group) =>
							order.key.includes(group.key) ||
							order.key.includes(query.aggregateOperator),
					),
				)
				.map((item) => ({
					label: transformStringWithPrefix({
						str: item.key,
						prefix: item.type || '',
						condition: !item.isColumn,
					}),
					key: item.key,
					value: item.key,
					disabled: undefined,
					title: undefined,
				})),
		[query.aggregateOperator, query.groupBy, query.orderBy],
	);

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
}
