import { Select, Spin } from 'antd';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import { useMemo } from 'react';
import { DataSource, MetricAggregateOperator } from 'types/common/queryBuilder';

import { selectStyle } from '../QueryBuilderSearch/config';
import { OrderByFilterProps } from './OrderByFilter.interfaces';
import { useOrderByFilter } from './useOrderByFilter';

export function OrderByFilter({
	query,
	onChange,
}: OrderByFilterProps): JSX.Element {
	const {
		debouncedSearchText,
		selectedValue,
		aggregationOptions,
		generateOptions,
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

		return generateOptions(options);
	}, [
		aggregationOptions,
		createOptions,
		data?.payload?.attributeKeys,
		generateOptions,
		query.aggregateOperator,
		query.groupBy,
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
