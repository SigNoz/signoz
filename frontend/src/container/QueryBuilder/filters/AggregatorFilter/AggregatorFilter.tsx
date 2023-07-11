// ** Components
import { AutoComplete, Spin } from 'antd';
// ** Api
import { getAggregateAttribute } from 'api/queryBuilder/getAggregateAttribute';
import {
	baseAutoCompleteIdKeysOrder,
	idDivider,
	initialAutocompleteData,
	QueryBuilderKeys,
	selectValueDivider,
} from 'constants/queryBuilder';
import useDebounce from 'hooks/useDebounce';
import { createIdFromObjectFields } from 'lib/createIdFromObjectFields';
import { chooseAutocompleteFromCustomValue } from 'lib/newQueryBuilder/chooseAutocompleteFromCustomValue';
import { getAutocompleteValueAndType } from 'lib/newQueryBuilder/getAutocompleteValueAndType';
import { transformStringWithPrefix } from 'lib/query/transformStringWithPrefix';
import { memo, useCallback, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import {
	AutocompleteType,
	BaseAutocompleteData,
	DataType,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';
import { ExtendedSelectOption } from 'types/common/select';
import { transformToUpperCase } from 'utils/transformToUpperCase';

import { selectStyle } from '../QueryBuilderSearch/config';
// ** Types
import { AgregatorFilterProps } from './AggregatorFilter.intefaces';

export const AggregatorFilter = memo(function AggregatorFilter({
	query,
	disabled,
	onChange,
}: AgregatorFilterProps): JSX.Element {
	const [optionsData, setOptionsData] = useState<ExtendedSelectOption[]>([]);
	const [searchText, setSearchText] = useState<string>(
		query.aggregateAttribute.key,
	);

	const handleChangeAttribute = useCallback(
		(data: BaseAutocompleteData[]) => {
			const attribute = chooseAutocompleteFromCustomValue(data, [searchText]);

			onChange(attribute[0]);
		},
		[onChange, searchText],
	);

	const debouncedSearchText = useMemo(() => {
		// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-unused-vars
		const [_, value] = getAutocompleteValueAndType(searchText);

		return value;
	}, [searchText]);

	const debouncedValue = useDebounce(debouncedSearchText, 300);
	const { isFetching } = useQuery(
		[
			QueryBuilderKeys.GET_AGGREGATE_ATTRIBUTE,
			debouncedValue,
			query.aggregateOperator,
			query.dataSource,
		],
		async () =>
			getAggregateAttribute({
				searchText: debouncedValue,
				aggregateOperator: query.aggregateOperator,
				dataSource: query.dataSource,
			}),
		{
			enabled: !!query.aggregateOperator && !!query.dataSource,
			onSuccess: (data) => {
				const options: ExtendedSelectOption[] =
					data?.payload?.attributeKeys?.map(({ id: _, ...item }) => ({
						label: transformStringWithPrefix({
							str: item.key,
							prefix: item.type || '',
							condition: !item.isColumn,
						}),
						value: `${item.key}${selectValueDivider}${createIdFromObjectFields(
							item,
							baseAutoCompleteIdKeysOrder,
						)}`,
						key: createIdFromObjectFields(item, baseAutoCompleteIdKeysOrder),
					})) || [];

				handleChangeAttribute(data.payload?.attributeKeys || []);

				setOptionsData(options);
			},
		},
	);

	const handleSearchText = useCallback((text: string): void => {
		setSearchText(text);
	}, []);

	const placeholder: string =
		query.dataSource === DataSource.METRICS
			? `${transformToUpperCase(query.dataSource)} name`
			: 'Aggregate attribute';

	const handleSelect = (
		value: string,
		option: ExtendedSelectOption | ExtendedSelectOption[],
	): void => {
		const currentOption = option as ExtendedSelectOption;

		if (currentOption.key) {
			const [key, dataType, type, isColumn] = currentOption.key.split(idDivider);
			const attribute: BaseAutocompleteData = {
				key,
				dataType: dataType as DataType,
				type: type as AutocompleteType,
				isColumn: isColumn === 'true',
			};

			const text = transformStringWithPrefix({
				str: attribute.key,
				prefix: attribute.type || '',
				condition: !attribute.isColumn,
			});

			setSearchText(text);

			onChange(attribute);
		} else {
			const customAttribute: BaseAutocompleteData = {
				...initialAutocompleteData,
				key: value,
			};

			const text = transformStringWithPrefix({
				str: customAttribute.key,
				prefix: customAttribute.type || '',
				condition: !customAttribute.isColumn,
			});

			setSearchText(text);

			onChange(customAttribute);
		}
	};

	return (
		<AutoComplete
			placeholder={placeholder}
			style={selectStyle}
			showArrow={false}
			searchValue={searchText}
			onSearch={handleSearchText}
			filterOption={false}
			notFoundContent={isFetching ? <Spin size="small" /> : null}
			options={optionsData}
			value={searchText}
			onSelect={handleSelect}
			disabled={disabled}
		/>
	);
});
