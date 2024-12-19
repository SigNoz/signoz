import { Select, Spin } from 'antd';
import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
// ** Constants
import { idDivider, QueryBuilderKeys } from 'constants/queryBuilder';
import { DEBOUNCE_DELAY } from 'constants/queryBuilderFilterConfig';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import useDebounce from 'hooks/useDebounce';
import { chooseAutocompleteFromCustomValue } from 'lib/newQueryBuilder/chooseAutocompleteFromCustomValue';
// ** Components
// ** Helpers
import { transformStringWithPrefix } from 'lib/query/transformStringWithPrefix';
import { isEqual, uniqWith } from 'lodash-es';
import { memo, ReactNode, useCallback, useEffect, useState } from 'react';
import { useQueryClient } from 'react-query';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { SelectOption } from 'types/common/select';
import { popupContainer } from 'utils/selectPopupContainer';

import { selectStyle } from '../QueryBuilderSearch/config';
import OptionRenderer from '../QueryBuilderSearch/OptionRenderer';
import { GroupByFilterProps } from './GroupByFilter.interfaces';
import { removePrefix } from './utils';

export const GroupByFilter = memo(function GroupByFilter({
	query,
	onChange,
	disabled,
}: GroupByFilterProps): JSX.Element {
	const queryClient = useQueryClient();
	const [searchText, setSearchText] = useState<string>('');
	const [optionsData, setOptionsData] = useState<
		SelectOption<string, ReactNode>[]
	>([]);
	const [localValues, setLocalValues] = useState<SelectOption<string, string>[]>(
		[],
	);
	const [isFocused, setIsFocused] = useState<boolean>(false);

	const debouncedValue = useDebounce(searchText, DEBOUNCE_DELAY);

	const { isFetching } = useGetAggregateKeys(
		{
			aggregateAttribute: query.aggregateAttribute.key,
			dataSource: query.dataSource,
			aggregateOperator: query.aggregateOperator,
			searchText: debouncedValue,
		},
		{
			queryKey: [debouncedValue, isFocused],
			enabled: !disabled && isFocused,
			onSuccess: (data) => {
				const keys = query.groupBy.reduce<string[]>((acc, item) => {
					acc.push(item.key);
					return acc;
				}, []);

				const filteredOptions: BaseAutocompleteData[] =
					data?.payload?.attributeKeys?.filter(
						(attrKey) => !keys.includes(attrKey.key),
					) || [];

				const options: SelectOption<string, ReactNode>[] =
					filteredOptions.map((item) => ({
						label: (
							<OptionRenderer
								key={item.key}
								label={transformStringWithPrefix({
									str: item.key,
									prefix: item.type || '',
									condition: !item.isColumn,
								})}
								value={removePrefix(
									transformStringWithPrefix({
										str: item.key,
										prefix: item.type || '',
										condition: !item.isColumn,
									}),
									!item.isColumn && item.type ? item.type : '',
								)}
								dataType={item.dataType || ''}
								type={item.type || ''}
							/>
						),
						value: `${item.id}`,
					})) || [];

				setOptionsData(options);
			},
		},
	);

	const getAttributeKeys = useCallback(async () => {
		const response = await queryClient.fetchQuery(
			[QueryBuilderKeys.GET_AGGREGATE_KEYS, searchText, isFocused],
			async () =>
				getAggregateKeys({
					aggregateAttribute: query.aggregateAttribute.key,
					dataSource: query.dataSource,
					aggregateOperator: query.aggregateOperator,
					searchText,
				}),
		);

		return response.payload?.attributeKeys || [];
	}, [
		isFocused,
		query.aggregateAttribute.key,
		query.aggregateOperator,
		query.dataSource,
		queryClient,
		searchText,
	]);

	const handleSearchKeys = (searchText: string): void => {
		setSearchText(searchText);
	};

	const handleBlur = (): void => {
		setIsFocused(false);
		setSearchText('');
	};

	const handleFocus = (): void => {
		setIsFocused(true);
	};

	const handleChange = useCallback(
		async (values: SelectOption<string, string>[]): Promise<void> => {
			const keys = await getAttributeKeys();

			const groupByValues: BaseAutocompleteData[] = values.map((item) => {
				const id = item.value;
				const currentValue = item.value.split(idDivider)[0];

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

	const clearSearch = useCallback(() => {
		setSearchText('');
	}, []);

	useEffect(() => {
		const currentValues: SelectOption<string, string>[] = query.groupBy.map(
			(item) => ({
				label: `${removePrefix(
					transformStringWithPrefix({
						str: item.key,
						prefix: item.type || '',
						condition: !item.isColumn,
					}),
					!item.isColumn && item.type ? item.type : '',
				)}`,
				value: `${item.id}`,
			}),
		);

		setLocalValues(currentValues);
	}, [query]);

	return (
		<Select
			getPopupContainer={popupContainer}
			mode="tags"
			style={selectStyle}
			onSearch={handleSearchKeys}
			showSearch
			disabled={disabled}
			filterOption={false}
			onBlur={handleBlur}
			onFocus={handleFocus}
			onDeselect={clearSearch}
			options={optionsData}
			value={localValues}
			labelInValue
			notFoundContent={isFetching ? <Spin size="small" /> : null}
			onChange={handleChange}
			data-testid="group-by"
		/>
	);
});
