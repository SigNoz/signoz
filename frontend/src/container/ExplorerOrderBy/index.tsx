import { memo, useMemo } from 'react';
import { ComboboxSimple, ComboboxSimpleItem } from '@signozhq/ui/combobox';
import { IOption } from 'hooks/useResourceAttribute/types';
import { OrderByFilterProps } from 'container/QueryBuilder/filters/OrderByFilter/OrderByFilter.interfaces';
import { useOrderByFilter } from 'container/QueryBuilder/filters/OrderByFilter/useOrderByFilter';
import { selectStyle } from 'container/QueryBuilder/filters/QueryBuilderSearch/config';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import { uniqWith } from 'lodash-es';
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
	} = useOrderByFilter({ query, onChange });

	const { data, isFetching } = useGetAggregateKeys(
		{
			aggregateAttribute: query.aggregateAttribute?.key || '',
			dataSource: query.dataSource,
			aggregateOperator: query.aggregateOperator || '',
			searchText: debouncedSearchText,
		},
		{
			keepPreviousData: true,
		},
	);

	const options = useMemo(() => {
		const keysOptions = createOptions(data?.payload?.attributeKeys || []);

		const customOptions = createOptions([
			{ key: 'timestamp', type: '', dataType: DataTypes.EMPTY },
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

	const items: ComboboxSimpleItem[] = useMemo(() => {
		const merged: IOption[] = [...selectedValue, ...options];
		const unique = uniqWith(merged, (a, b) => a.value === b.value);
		return unique.map((opt) => ({
			label: opt.label,
			displayValue: opt.label,
			value: opt.value,
		}));
	}, [selectedValue, options]);

	const value = useMemo(
		() => selectedValue.map((item) => item.value),
		[selectedValue],
	);

	const handleComboboxChange = (next: string | string[]): void => {
		const values = (next as string[]) || [];
		const asOptions: IOption[] = values.map((v) => {
			const found = items.find((item) => item.value === v);
			return {
				label: typeof found?.label === 'string' ? found.label : v,
				value: v,
			};
		});
		handleChange(asOptions);
	};

	return (
		<ComboboxSimple
			multiple
			allowCreate
			loading={isFetching}
			style={selectStyle}
			items={items}
			value={value}
			onChange={handleComboboxChange}
		/>
	);
}

export default memo(ExplorerOrderBy);
