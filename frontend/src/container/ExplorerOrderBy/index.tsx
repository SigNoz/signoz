import { Select, Spin } from 'antd';
import { OrderByFilterProps } from 'container/QueryBuilder/filters/OrderByFilter/OrderByFilter.interfaces';
import { useOrderByFilter } from 'container/QueryBuilder/filters/OrderByFilter/useOrderByFilter';
import { getLabelFromValue } from 'container/QueryBuilder/filters/OrderByFilter/utils';
import { selectStyle } from 'container/QueryBuilder/filters/QueryBuilderSearch/config';
import { getRemoveOrderFromValue } from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import { isEqual, uniqWith } from 'lodash-es';
import { memo, useMemo } from 'react';
import { StringOperators } from 'types/common/queryBuilder';

function ExplorerOrderBy({ query, onChange }: OrderByFilterProps): JSX.Element {
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
			keepPreviousData: true,
		},
	);

	const options = useMemo(() => {
		const keysOptions = createOptions(data?.payload?.attributeKeys || []);

		const customOptions = createOptions([
			{ key: 'timestamp', isColumn: true, type: null, dataType: null },
		]);

		const baseOptions = [
			...customOptions,
			...(query.aggregateOperator === StringOperators.NOOP
				? []
				: aggregationOptions),
			...keysOptions,
		];

		const currentCustomValue = baseOptions.find((keyOption) =>
			getRemoveOrderFromValue(keyOption.value).includes(debouncedSearchText),
		)
			? []
			: customValue;

		const result = [...currentCustomValue, ...baseOptions];

		const uniqResult = uniqWith(result, isEqual);

		return uniqResult.filter(
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
		selectedValue,
	]);

	return (
		<Select
			mode="tags"
			style={selectStyle}
			onSearch={handleSearchKeys}
			showSearch
			showArrow={false}
			value={selectedValue}
			labelInValue
			filterOption={false}
			options={options}
			notFoundContent={isFetching ? <Spin size="small" /> : null}
			onChange={handleChange}
		/>
	);
}

export default memo(ExplorerOrderBy);
