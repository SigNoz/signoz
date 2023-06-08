import { Select, Spin } from 'antd';
import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
import { DEBOUNCE_DELAY } from 'constants/common';
// ** Constants
import { QueryBuilderKeys, selectValueDivider } from 'constants/queryBuilder';
import { GROUP_BY_OPTION_ID, GROUP_BY_SELECT_ID } from 'constants/testIds';
import useDebounce from 'hooks/useDebounce';
import { transformGroupByFilterValues } from 'lib/query/transformGroupByFilterValues';
// ** Components
// ** Helpers
import { transformStringWithPrefix } from 'lib/query/transformStringWithPrefix';
import { memo, useCallback, useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { SelectOption } from 'types/common/select';

import { selectStyle } from '../QueryBuilderSearch/config';
import { GroupByFilterProps } from './GroupByFilter.interfaces';

const { Option } = Select;

export const GroupByFilter = memo(function GroupByFilter({
	query,
	onChange,
	disabled,
}: GroupByFilterProps): JSX.Element {
	const [searchText, setSearchText] = useState<string>('');
	const [optionsData, setOptionsData] = useState<SelectOption<string, string>[]>(
		[],
	);
	const [localValues, setLocalValues] = useState<SelectOption<string, string>[]>(
		[],
	);
	const [isFocused, setIsFocused] = useState<boolean>(false);

	const debouncedValue = useDebounce(searchText, DEBOUNCE_DELAY);

	const { isFetching } = useQuery(
		[QueryBuilderKeys.GET_AGGREGATE_KEYS, debouncedValue],
		async () =>
			getAggregateKeys({
				aggregateAttribute: query.aggregateAttribute.key,
				dataSource: query.dataSource,
				aggregateOperator: query.aggregateOperator,
				searchText: debouncedValue,
			}),
		{
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

				const options: SelectOption<string, string>[] =
					filteredOptions.map((item) => ({
						label: transformStringWithPrefix({
							str: item.key,
							prefix: item.type || '',
							condition: !item.isColumn,
						}),
						value: `${transformStringWithPrefix({
							str: item.key,
							prefix: item.type || '',
							condition: !item.isColumn,
						})}${selectValueDivider}${item.id}`,
					})) || [];

				setOptionsData(options);
			},
		},
	);

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

	const handleChange = (values: SelectOption<string, string>[]): void => {
		const result = transformGroupByFilterValues(values);

		onChange(result);
	};

	const clearSearch = useCallback(() => {
		setSearchText('');
	}, []);

	useEffect(() => {
		const currentValues: SelectOption<string, string>[] = query.groupBy.map(
			(item) => ({
				label: `${transformStringWithPrefix({
					str: item.key,
					prefix: item.type || '',
					condition: !item.isColumn,
				})}`,
				value: `${transformStringWithPrefix({
					str: item.key,
					prefix: item.type || '',
					condition: !item.isColumn,
				})}${selectValueDivider}${item.id}`,
			}),
		);

		setLocalValues(currentValues);
	}, [query]);

	return (
		<Select
			data-testid={GROUP_BY_SELECT_ID}
			mode="tags"
			style={selectStyle}
			onSearch={handleSearchKeys}
			showSearch
			disabled={disabled}
			showArrow={false}
			filterOption={false}
			onBlur={handleBlur}
			onFocus={handleFocus}
			onDeselect={clearSearch}
			value={localValues}
			labelInValue
			notFoundContent={isFetching ? <Spin size="small" /> : null}
			onChange={handleChange}
		>
			{optionsData.map((option) => (
				<Option
					key={option.value}
					value={option.value}
					data-testid={GROUP_BY_OPTION_ID}
					title={option.value}
				>
					{option.label}
				</Option>
			))}
		</Select>
	);
});
