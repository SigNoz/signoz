import { Select, Spin } from 'antd';
import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
import { QueryBuilderKeys } from 'constants/queryBuilder';
import { IOption } from 'hooks/useResourceAttribute/types';
import { uniqWith } from 'lodash-es';
import * as Papa from 'papaparse';
import { useCallback, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { OrderByPayload } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource, MetricAggregateOperator } from 'types/common/queryBuilder';

import { selectStyle } from '../QueryBuilderSearch/config';
import { getRemoveOrderFromValue } from '../QueryBuilderSearch/utils';
import { FILTERS } from './config';
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
	const [selectedValue, setSelectedValue] = useState<IOption[]>([]);

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
						label: `${query.aggregateOperator}(${query.aggregateAttribute.key}) ${FILTERS.ASC}`,
						value: `${query.aggregateOperator}(${query.aggregateAttribute.key})${orderByValueDelimiter}${FILTERS.ASC}`,
					},
					{
						label: `${query.aggregateOperator}(${query.aggregateAttribute.key}) ${FILTERS.DESC}`,
						value: `${query.aggregateOperator}(${query.aggregateAttribute.key})${orderByValueDelimiter}${FILTERS.DESC}`,
					},
				]),
		[query.aggregateAttribute.key, query.aggregateOperator, query.groupBy],
	);

	const customValue: IOption[] = useMemo(() => {
		if (!searchText) return [];

		return [
			{
				label: `${searchText} ${FILTERS.ASC}`,
				value: `${searchText}${orderByValueDelimiter}${FILTERS.ASC}`,
			},
			{
				label: `${searchText} ${FILTERS.DESC}`,
				value: `${searchText}${orderByValueDelimiter}${FILTERS.DESC}`,
			},
		];
	}, [searchText]);

	const optionsData = useMemo(() => {
		const options =
			query.aggregateOperator === MetricAggregateOperator.NOOP
				? noAggregationOptions
				: aggregationOptions;

		const resultOption = [...customValue, ...options];

		return resultOption.filter(
			(option) =>
				!getLabelFromValue(selectedValue).includes(
					getRemoveOrderFromValue(option.value),
				),
		);
	}, [
		aggregationOptions,
		customValue,
		noAggregationOptions,
		query.aggregateOperator,
		selectedValue,
	]);

	const getUniqValues = useCallback((values: IOption[]): IOption[] => {
		const modifiedValues = values.map((item) => {
			const match = Papa.parse(item.value, { delimiter: orderByValueDelimiter });
			if (!match) return { label: item.label, value: item.value };
			// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-unused-vars
			const [_, order] = match.data.flat() as string[];
			if (order) return { label: item.label, value: item.value };

			return {
				label: `${item.value} ${FILTERS.ASC}`,
				value: `${item.value}${orderByValueDelimiter}${FILTERS.ASC}`,
			};
		});

		return uniqWith(
			modifiedValues,
			(current, next) =>
				getRemoveOrderFromValue(current.value) ===
				getRemoveOrderFromValue(next.value),
		);
	}, []);

	const handleChange = (values: IOption[]): void => {
		const result = getUniqValues(values);

		setSelectedValue(result);
		const orderByValues: OrderByPayload[] = result.map((item) => {
			const match = Papa.parse(item.value, { delimiter: orderByValueDelimiter });

			if (match) {
				const [columnName, order] = match.data.flat() as string[];
				return {
					columnName: checkIfKeyPresent(columnName, query.aggregateAttribute.key)
						? '#SIGNOZ_VALUE'
						: columnName,
					order: order ?? 'asc',
				};
			}

			return {
				columnName: item.value,
				order: 'asc',
			};
		});

		setSearchText('');
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
			value={selectedValue}
			labelInValue
			filterOption={false}
			options={optionsData}
			notFoundContent={isFetching ? <Spin size="small" /> : null}
			onChange={handleChange}
		/>
	);
}
