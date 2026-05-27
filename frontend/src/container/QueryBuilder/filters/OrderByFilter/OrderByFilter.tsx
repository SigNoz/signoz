import { useMemo } from 'react';
import { ComboboxSimple, ComboboxSimpleItem } from '@signozhq/ui/combobox';
import { IOption } from 'hooks/useResourceAttribute/types';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import { uniqWith } from 'lodash-es';
import { DataSource, MetricAggregateOperator } from 'types/common/queryBuilder';
import { getParsedAggregationOptionsForOrderBy } from 'utils/aggregationConverter';

import { selectStyle } from '../QueryBuilderSearch/config';
import { OrderByFilterProps } from './OrderByFilter.interfaces';
import { useOrderByFilter } from './useOrderByFilter';
import styles from './OrderByFilter.module.scss';

export function OrderByFilter({
	query,
	onChange,
	isListViewPanel = false,
	entityVersion,
	isNewQueryV2 = false,
}: OrderByFilterProps): JSX.Element {
	const {
		debouncedSearchText,
		selectedValue,
		aggregationOptions,
		generateOptions,
		createOptions,
		handleChange,
	} = useOrderByFilter({ query, onChange, entityVersion });

	const { data, isFetching } = useGetAggregateKeys(
		{
			aggregateAttribute: query.aggregateAttribute?.key || '',
			dataSource: query.dataSource,
			aggregateOperator: query.aggregateOperator || '',
			searchText: debouncedSearchText,
		},
		{
			enabled: !!query.aggregateAttribute?.key || isListViewPanel,
			keepPreviousData: true,
		},
	);

	// Get parsed aggregation options using createAggregation only for QueryV2
	const parsedAggregationOptions = useMemo(
		() => (isNewQueryV2 ? getParsedAggregationOptionsForOrderBy(query) : []),
		[query, isNewQueryV2],
	);

	const optionsData = useMemo(() => {
		const keyOptions = createOptions(data?.payload?.attributeKeys || []);
		const groupByOptions = createOptions(query.groupBy);
		const aggregationOptionsFromParsed = createOptions(parsedAggregationOptions);

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
		data?.payload?.attributeKeys,
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

	const isDisabled = isMetricsDataSource && isDisabledSelect;

	return (
		<ComboboxSimple
			multiple
			allowCreate
			loading={isFetching}
			style={{
				...selectStyle,
			}}
			disabled={isDisabled}
			items={items}
			value={value}
			onChange={handleComboboxChange}
			className={styles.filter}
		/>
	);
}
