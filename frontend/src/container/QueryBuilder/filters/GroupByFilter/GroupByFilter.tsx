import {
	memo,
	ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { useQueryClient } from 'react-query';
import { ComboboxSimple, ComboboxSimpleItem } from '@signozhq/ui/combobox';
import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
// ** Constants
import { idDivider, QueryBuilderKeys } from 'constants/queryBuilder';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import { chooseAutocompleteFromCustomValue } from 'lib/newQueryBuilder/chooseAutocompleteFromCustomValue';
// ** Components
// ** Helpers
import { isEqual, uniqWith } from 'lodash-es';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

import { selectStyle } from '../QueryBuilderSearch/config';
import OptionRenderer from '../QueryBuilderSearch/OptionRenderer';
import { GroupByFilterProps } from './GroupByFilter.interfaces';

export const GroupByFilter = memo(function GroupByFilter({
	query,
	onChange,
	disabled,
	signalSource,
}: GroupByFilterProps): JSX.Element {
	const queryClient = useQueryClient();
	const [optionsData, setOptionsData] = useState<ComboboxSimpleItem[]>([]);
	const [localValues, setLocalValues] = useState<string[]>([]);
	const [localItems, setLocalItems] = useState<ComboboxSimpleItem[]>([]);

	const dataSource = useMemo(() => {
		if (signalSource === 'meter') {
			return 'meter' as DataSource;
		}
		return query.dataSource;
	}, [signalSource, query.dataSource]);

	const { isFetching } = useGetAggregateKeys(
		{
			aggregateAttribute: query.aggregateAttribute?.key || '',
			dataSource,
			aggregateOperator: query.aggregateOperator || '',
			searchText: '',
		},
		{
			enabled: !disabled,
			onSuccess: (data) => {
				const keys = query.groupBy.reduce<string[]>((acc, item) => {
					acc.push(item.key);
					return acc;
				}, []);

				const filteredOptions: BaseAutocompleteData[] =
					data?.payload?.attributeKeys?.filter(
						(attrKey) => !keys.includes(attrKey.key),
					) || [];

				const options: ComboboxSimpleItem[] =
					filteredOptions.map((item) => ({
						label: (
							<OptionRenderer
								key={item.key}
								label={item.key}
								value={item.key}
								dataType={item.dataType || ''}
								type={item.type || ''}
							/>
						) as ReactNode,
						displayValue: item.key,
						value: `${item.id}`,
					})) || [];

				setOptionsData(options);
			},
		},
	);

	const getAttributeKeys = useCallback(async () => {
		const response = await queryClient.fetchQuery(
			[QueryBuilderKeys.GET_AGGREGATE_KEYS, ''],
			async () =>
				getAggregateKeys({
					aggregateAttribute: query.aggregateAttribute?.key || '',
					dataSource,
					aggregateOperator: query.aggregateOperator || '',
					searchText: '',
				}),
		);

		return response.payload?.attributeKeys || [];
	}, [
		query.aggregateAttribute?.key,
		query.aggregateOperator,
		dataSource,
		queryClient,
	]);

	const handleChange = useCallback(
		async (value: string | string[]): Promise<void> => {
			const values = (value as string[]) || [];
			const keys = await getAttributeKeys();

			const groupByValues: BaseAutocompleteData[] = values.map((itemValue) => {
				const id = itemValue;
				const currentValue = itemValue.split(idDivider)[0];

				if (id && id.includes(idDivider)) {
					const attribute = keys.find((item) => item.id === id);
					const existAttribute = query.groupBy.find((item) => item.id === id);

					if (attribute) {
						return attribute;
					}

					if (existAttribute) {
						return existAttribute;
					}
				}

				return chooseAutocompleteFromCustomValue(keys, currentValue);
			});

			const result = uniqWith(groupByValues, isEqual);

			onChange(result);
		},
		[getAttributeKeys, onChange, query.groupBy],
	);

	useEffect(() => {
		const currentValues: string[] =
			query.groupBy?.map((item) => `${item.id}`) || [];

		const currentItems: ComboboxSimpleItem[] =
			query.groupBy?.map((item) => ({
				label: `${item.key}`,
				displayValue: `${item.key}`,
				value: `${item.id}`,
			})) || [];

		setLocalValues(currentValues);
		setLocalItems(currentItems);
	}, [query]);

	const items: ComboboxSimpleItem[] = useMemo(() => {
		const merged = [...localItems, ...optionsData];
		return uniqWith(merged, (a, b) => a.value === b.value);
	}, [localItems, optionsData]);

	return (
		<ComboboxSimple
			multiple
			allowCreate
			loading={isFetching}
			style={{
				...selectStyle,
			}}
			disabled={disabled}
			items={items}
			value={localValues}
			onChange={handleChange}
			testId="group-by"
			placeholder={localValues?.length === 0 ? 'Everything (no breakdown)' : ''}
		/>
	);
});
