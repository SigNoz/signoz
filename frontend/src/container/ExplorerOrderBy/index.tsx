import { Select, Spin } from 'antd';
import { OrderByFilterProps } from 'container/QueryBuilder/filters/OrderByFilter/OrderByFilter.interfaces';
import { useOrderByFilter } from 'container/QueryBuilder/filters/OrderByFilter/useOrderByFilter';
import { selectStyle } from 'container/QueryBuilder/filters/QueryBuilderSearch/config';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import { memo, useMemo } from 'react';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { StringOperators } from 'types/common/queryBuilder';

function ExplorerOrderBy({ query, onChange }: OrderByFilterProps): JSX.Element {
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
			keepPreviousData: true,
		},
	);

	const options = useMemo(() => {
		const keysOptions = createOptions(data?.payload?.attributeKeys || []);

		const customOptions = createOptions([
			{ key: 'timestamp', isColumn: true, type: '', dataType: DataTypes.EMPTY },
		]);

		const baseOptions = [
			...customOptions,
			...(query.aggregateOperator === StringOperators.NOOP
				? []
				: aggregationOptions),
			...keysOptions,
		];

		return generateOptions(baseOptions);
	}, [
		aggregationOptions,
		createOptions,
		data?.payload?.attributeKeys,
		generateOptions,
		query.aggregateOperator,
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
			options={options}
			notFoundContent={isFetching ? <Spin size="small" /> : null}
			onChange={handleChange}
		/>
	);
}

export default memo(ExplorerOrderBy);
