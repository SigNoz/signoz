import { Select, Spin } from 'antd';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import { useMemo } from 'react';
import { MetricAggregateOperator } from 'types/common/queryBuilder';
import { popupContainer } from 'utils/selectPopupContainer';

import { selectStyle } from '../../QueryBuilderSearch/config';
import { OrderByProps } from './types';
import { useOrderByFormulaFilter } from './useOrderByFormulaFilter';

function OrderByFilter({
	formula,
	onChange,
	query,
}: OrderByProps): JSX.Element {
	const {
		debouncedSearchText,
		createOptions,
		aggregationOptions,
		handleChange,
		handleSearchKeys,
		selectedValue,
		generateOptions,
	} = useOrderByFormulaFilter({
		query,
		onChange,
		formula,
	});

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

	const isDisabledSelect =
		!query.aggregateAttribute.key ||
		query.aggregateOperator === MetricAggregateOperator.NOOP;

	return (
		<Select
			getPopupContainer={popupContainer}
			mode="tags"
			style={selectStyle}
			onSearch={handleSearchKeys}
			showSearch
			disabled={isDisabledSelect}
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

export default OrderByFilter;
