import { Select, Spin } from 'antd';
import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
// ** Constants
import {
	idDivider,
	initialAutocompleteData,
	QueryBuilderKeys,
	selectValueDivider,
} from 'constants/queryBuilder';
import useDebounce from 'hooks/useDebounce';
// ** Components
// ** Helpers
import { transformStringWithPrefix } from 'lib/query/transformStringWithPrefix';
import { isEqual, uniqWith } from 'lodash-es';
import { memo, useCallback, useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import {
	AutocompleteType,
	BaseAutocompleteData,
	DataType,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { SelectOption } from 'types/common/select';

import { selectStyle } from '../QueryBuilderSearch/config';
import { GroupByFilterProps } from './GroupByFilter.interfaces';

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

	const debouncedValue = useDebounce(searchText, 300);

	const { isFetching } = useQuery(
		[QueryBuilderKeys.GET_AGGREGATE_KEYS, debouncedValue, isFocused],
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
		const groupByValues: BaseAutocompleteData[] = values.map((item) => {
			const [currentValue, id] = item.value.split(selectValueDivider);
			if (id && id.includes(idDivider)) {
				const [key, dataType, type, isColumn] = id.split(idDivider);

				return {
					id,
					key,
					dataType: dataType as DataType,
					type: type as AutocompleteType,
					isColumn: isColumn === 'true',
				};
			}

			return { ...initialAutocompleteData, key: currentValue };
		});

		const result = uniqWith(groupByValues, isEqual);

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
			options={optionsData}
			value={localValues}
			labelInValue
			notFoundContent={isFetching ? <Spin size="small" /> : null}
			onChange={handleChange}
		/>
	);
});
