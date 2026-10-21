import { useMemo } from 'react';
import { Select, Spin } from 'antd';
import { useFieldKeysSuggestion } from 'hooks/querySuggestions/useFieldKeysSuggestion';
import {
	DATA_SOURCE_TO_SIGNAL,
	DataSource,
	MetricAggregateOperator,
	QUERY_SOURCE_TO_FIELD_SOURCE,
} from 'types/common/queryBuilder';
import { getParsedAggregationOptionsForOrderBy } from 'utils/aggregationConverter';
import { useSelectPopupContainer } from 'utils/selectPopupContainer';

import { selectStyle } from '../QueryBuilderSearchV2/config';
import { getMetricNameForQuery } from '../utils';
import { OrderByFilterProps } from './OrderByFilter.interfaces';
import { useOrderByFilter } from './useOrderByFilter';

export function OrderByFilter({
	query,
	onChange,
	isRawQuery = false,
	entityVersion,
	isNewQueryV2 = false,
	placeholder,
}: OrderByFilterProps): JSX.Element {
	const getPopupContainer = useSelectPopupContainer();
	const {
		debouncedSearchText,
		selectedValue,
		aggregationOptions,
		generateOptions,
		createOptions,
		handleChange,
		handleSearchKeys,
	} = useOrderByFilter({ query, onChange, entityVersion });

	const { data: fieldKeys, isFetching } = useFieldKeysSuggestion(
		{
			signal: DATA_SOURCE_TO_SIGNAL[query.dataSource],
			source: QUERY_SOURCE_TO_FIELD_SOURCE[query.source ?? ''],
			metricName: getMetricNameForQuery(query),
			searchText: debouncedSearchText,
		},
		query.builderQueryType,
		{
			enabled: !!query.aggregateAttribute?.key || isRawQuery,
			keepPreviousData: true,
		},
	);

	// Get parsed aggregation options using createAggregation only for QueryV2
	const parsedAggregationOptions = useMemo(
		() => (isNewQueryV2 ? getParsedAggregationOptionsForOrderBy(query) : []),
		[query, isNewQueryV2],
	);

	const optionsData = useMemo(() => {
		const keyOptions = createOptions((fieldKeys ?? []).map((key) => key.name));
		const groupByOptions = createOptions(query.groupBy.map((item) => item.key));
		const aggregationOptionsFromParsed = createOptions(
			parsedAggregationOptions.map((item) => item.key),
		);

		const options =
			query.aggregateOperator === MetricAggregateOperator.NOOP
				? keyOptions
				: [
						...groupByOptions,
						...(isNewQueryV2 ? aggregationOptionsFromParsed : aggregationOptions),
					];

		return generateOptions(options);
	}, [
		createOptions,
		fieldKeys,
		query.groupBy,
		query.aggregateOperator,
		parsedAggregationOptions,
		aggregationOptions,
		generateOptions,
		isNewQueryV2,
	]);

	const isDisabledSelect =
		!query.aggregateAttribute?.key ||
		query.aggregateOperator === MetricAggregateOperator.NOOP;

	const isMetricsDataSource = query.dataSource === DataSource.METRICS;

	return (
		<Select
			getPopupContainer={getPopupContainer}
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
			placeholder={placeholder}
			data-testid="order-by"
		/>
	);
}
