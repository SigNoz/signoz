import { useMemo } from 'react';
import { Select, Spin } from 'antd';
import { useFieldKeyOptions } from 'hooks/querySuggestions/useFieldKeyOptions';
import {
	DATA_SOURCE_TO_SIGNAL,
	DataSource,
	MetricAggregateOperator,
} from 'types/common/queryBuilder';
import { getParsedAggregationOptionsForOrderBy } from 'utils/aggregationConverter';
import { useSelectPopupContainer } from 'utils/selectPopupContainer';

import { selectStyle } from '../config';
import { OrderByFilterProps } from './OrderByFilter.interfaces';
import { useOrderByFilter } from './useOrderByFilter';

export function OrderByFilter({
	query,
	onChange,
	entityVersion,
	isNewQueryV2 = false,
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

	const isNoopQuery = query.aggregateOperator === MetricAggregateOperator.NOOP;

	const { options: fieldKeyOptions, isFetching } = useFieldKeyOptions({
		fieldKeysConfig: {
			signal: DATA_SOURCE_TO_SIGNAL[query.dataSource],
			searchText: debouncedSearchText,
		},
		builderQueryType: query.builderQueryType,
		enabled: isNoopQuery,
	});

	// Get parsed aggregation options using createAggregation only for QueryV2
	const parsedAggregationOptions = useMemo(
		() => (isNewQueryV2 ? getParsedAggregationOptionsForOrderBy(query) : []),
		[query, isNewQueryV2],
	);

	const optionsData = useMemo(() => {
		const keyOptions = createOptions(
			fieldKeyOptions.map((option) => option.label),
		);
		const groupByOptions = createOptions(query.groupBy.map((item) => item.key));
		const aggregationOptionsFromParsed = createOptions(
			parsedAggregationOptions.map((item) => item.key),
		);

		const options = isNoopQuery
			? keyOptions
			: [
					...groupByOptions,
					...(isNewQueryV2 ? aggregationOptionsFromParsed : aggregationOptions),
				];

		return generateOptions(options);
	}, [
		createOptions,
		fieldKeyOptions,
		query.groupBy,
		isNoopQuery,
		parsedAggregationOptions,
		aggregationOptions,
		generateOptions,
		isNewQueryV2,
	]);

	const isDisabledSelect = !query.aggregateAttribute?.key || isNoopQuery;

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
			data-testid="order-by"
		/>
	);
}
