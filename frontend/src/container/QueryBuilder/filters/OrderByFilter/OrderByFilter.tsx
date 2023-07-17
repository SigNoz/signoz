import { Select, Spin } from 'antd';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import { useMemo } from 'react';
import { DataSource, MetricAggregateOperator } from 'types/common/queryBuilder';

import { selectStyle } from '../QueryBuilderSearch/config';
import { getRemoveOrderFromValue } from '../QueryBuilderSearch/utils';
import { OrderByFilterProps } from './OrderByFilter.interfaces';
import { useOrderByFilter } from './useOrderByFilter';
import { getLabelFromValue } from './utils';

export function OrderByFilter({
	query,
	onChange,
}: OrderByFilterProps): JSX.Element {
	const {
		debouncedSearchText,
		selectedValue,
		customValue,
		aggregationOptions,
		createOptions,
		handleChange,
		handleSearchKeys,
	} = useOrderByFilter({ query, onChange });

	const { data, isFetching } = useGetAggregateKeys(
		{
			aggregateAttribute: query.aggregateAttribute.key,
			dataSource: query.dataSource,
			aggregateOperator: query.aggregateOperator,
			searchText: debouncedSearchText,
		},
		{
			enabled: !!query.aggregateAttribute.key,
			keepPreviousData: true,
		},
	);

	const optionsData = useMemo(() => {
		const keyOptions = createOptions(data?.payload?.attributeKeys || []);
		const groupByOptions = createOptions(query.groupBy);
		const options =
			query.aggregateOperator === MetricAggregateOperator.NOOP
				? keyOptions
				: [...groupByOptions, ...aggregationOptions];

		const currentCustomValue = options.find((keyOption) =>
			getRemoveOrderFromValue(keyOption.value).includes(debouncedSearchText),
		)
			? []
			: customValue;

		const resultOption = [...currentCustomValue, ...options];

		return resultOption.filter(
			(option) =>
				!getLabelFromValue(selectedValue).includes(
					getRemoveOrderFromValue(option.value),
				),
		);
	}, [
		aggregationOptions,
		createOptions,
		customValue,
		data?.payload?.attributeKeys,
		debouncedSearchText,
		query.aggregateOperator,
		query.groupBy,
		selectedValue,
	]);

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
