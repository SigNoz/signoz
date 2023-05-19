import { Select, Spin } from 'antd';
import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
// ** Constants
import { QueryBuilderKeys, selectValueDivider } from 'constants/queryBuilder';
import useDebounce from 'hooks/useDebounce';
import { getFilterObjectValue } from 'lib/newQueryBuilder/getFilterObjectValue';
// ** Components
// ** Helpers
import { transformStringWithPrefix } from 'lib/query/transformStringWithPrefix';
import React, { memo, useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { SelectOption } from 'types/common/select';
import { v4 as uuid } from 'uuid';

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

	const { data, isFetching } = useQuery(
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
						})}${selectValueDivider}${item.id || uuid()}`,
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
		const responseKeys = data?.payload?.attributeKeys || [];

		const groupByValues: BaseAutocompleteData[] = values.map((item) => {
			const [currentValue, id] = item.value.split(selectValueDivider);
			const { key, type, isColumn } = getFilterObjectValue(currentValue);

			const existGroupQuery = query.groupBy.find((group) => group.id === id);

			if (existGroupQuery) {
				return existGroupQuery;
			}

			const existGroupResponse = responseKeys.find((group) => group.id === id);

			if (existGroupResponse) {
				return existGroupResponse;
			}

			return {
				id: uuid(),
				isColumn,
				key,
				dataType: null,
				type,
			};
		});

		onChange(groupByValues);
	};

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
				})}${selectValueDivider}${item.id || uuid()}`,
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
			options={optionsData}
			value={localValues}
			labelInValue
			notFoundContent={isFetching ? <Spin size="small" /> : null}
			onChange={handleChange}
		/>
	);
});
