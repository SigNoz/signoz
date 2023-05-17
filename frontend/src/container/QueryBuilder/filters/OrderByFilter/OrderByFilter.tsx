import { Select, Spin } from 'antd';
import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
import { QueryBuilderKeys } from 'constants/queryBuilder';
import * as Papa from 'papaparse';
import React, { useCallback, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { OrderByPayload } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource, MetricAggregateOperator } from 'types/common/queryBuilder';

import { selectStyle } from '../QueryBuilderSearch/config';
import { getRemoveOrderFromValue } from '../QueryBuilderSearch/utils';
import { OrderByFilterProps } from './OrderByFilter.interfaces';
import {
	checkIfKeyPresent,
	getLabelFromValue,
	mapLabelValuePairs,
	orderByValueDelimiter,
} from './utils';

export function OrderByFilter({
	query,
	onChange,
}: OrderByFilterProps): JSX.Element {
	const [searchText, setSearchText] = useState<string>('');
	const [selectedValue, setSelectedValue] = useState<string[]>([]);

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
				? mapLabelValuePairs(data?.payload?.attributeKeys).flat()
				: [],
		[data?.payload?.attributeKeys],
	);

	const aggregationOptions = useMemo(
		() =>
			mapLabelValuePairs(query.groupBy)
				.flat()
				.concat([
					{
						label: `${query.aggregateOperator}(${query.aggregateAttribute.key}) asc`,
						value: `${query.aggregateOperator}(${query.aggregateAttribute.key})${orderByValueDelimiter}asc`,
					},
					{
						label: `${query.aggregateOperator}(${query.aggregateAttribute.key}) desc`,
						value: `${query.aggregateOperator}(${query.aggregateAttribute.key})${orderByValueDelimiter}desc`,
					},
				]),
		[query.aggregateAttribute.key, query.aggregateOperator, query.groupBy],
	);

	const optionsData = useMemo(() => {
		const options =
			query.aggregateOperator === MetricAggregateOperator.NOOP
				? noAggregationOptions
				: aggregationOptions;
		return options.filter(
			(option) =>
				!getLabelFromValue(selectedValue).includes(
					getRemoveOrderFromValue(option.value),
				),
		);
	}, [
		aggregationOptions,
		noAggregationOptions,
		query.aggregateOperator,
		selectedValue,
	]);

	const handleChange = (values: string[]): void => {
		setSelectedValue(values);
		const orderByValues: OrderByPayload[] = values.map((item) => {
			const match = Papa.parse(item, { delimiter: '|' });
			if (match) {
				const [columnName, order] = match.data.flat() as string[];
				return {
					columnName: checkIfKeyPresent(columnName, query.aggregateAttribute.key)
						? '#SIGNOZ_VALUE'
						: columnName,
					order,
				};
			}

			return {
				columnName: item,
				order: '',
			};
		});
		onChange(orderByValues);
	};

	const isDisabledSelect = useMemo(
		() =>
			!query.aggregateAttribute.key ||
			query.aggregateOperator === MetricAggregateOperator.NOOP,
		[query.aggregateAttribute.key, query.aggregateOperator],
	);

	const isMetricsDataSource = useMemo(
		() => query.dataSource === DataSource.METRICS,
		[query.dataSource],
	);

	return (
		<Select
			mode="tags"
			style={selectStyle}
			onSearch={handleSearchKeys}
			showSearch
			disabled={isMetricsDataSource && isDisabledSelect}
			showArrow={false}
			filterOption={false}
			options={optionsData}
			notFoundContent={isFetching ? <Spin size="small" /> : null}
			onChange={handleChange}
		/>
	);
}
