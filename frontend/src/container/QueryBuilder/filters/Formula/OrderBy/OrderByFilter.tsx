import { useMemo } from 'react';
import { ComboboxSimple, ComboboxSimpleItem } from '@signozhq/ui/combobox';
import { IOption } from 'hooks/useResourceAttribute/types';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import { uniqWith } from 'lodash-es';
import { MetricAggregateOperator } from 'types/common/queryBuilder';

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
		selectedValue,
		generateOptions,
	} = useOrderByFormulaFilter({
		query,
		onChange,
		formula,
	});

	const { data, isFetching } = useGetAggregateKeys(
		{
			aggregateAttribute: query.aggregateAttribute?.key || '',
			dataSource: query.dataSource,
			aggregateOperator: query.aggregateOperator || '',
			searchText: debouncedSearchText,
		},
		{
			enabled: !!query.aggregateAttribute?.key,
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
		!query.aggregateAttribute?.key ||
		query.aggregateOperator === MetricAggregateOperator.NOOP;

	const items: ComboboxSimpleItem[] = useMemo(() => {
		const merged: IOption[] = [...selectedValue, ...optionsData];
		const unique = uniqWith(merged, (a, b) => a.value === b.value);
		return unique.map((opt) => ({
			label: opt.label,
			displayValue: opt.label,
			value: opt.value,
		}));
	}, [selectedValue, optionsData]);

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

	// Note: ComboboxSimple does not support disabled prop natively;
	// when disabled we render with pointer-events: none + reduced opacity.
	return (
		<ComboboxSimple
			multiple
			allowCreate
			loading={isFetching}
			style={{
				...selectStyle,
				...(isDisabledSelect && { pointerEvents: 'none', opacity: 0.5 }),
			}}
			items={items}
			value={value}
			onChange={handleComboboxChange}
		/>
	);
}

export default OrderByFilter;
