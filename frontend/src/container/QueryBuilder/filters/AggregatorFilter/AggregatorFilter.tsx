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
	const debouncedValue = useDebounce(query.aggregateAttribute.key, 300);
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

				setOptionsData(options);
			},
		},
	);

	const handleChangeAttribute = useCallback(
		(
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

				onChange(attribute);
			} else {
				const attribute = { ...initialAutocompleteData, key: value };

				onChange(attribute);
			}
		},
		[onChange],
	);

	const value = useMemo(
		() =>
			transformStringWithPrefix({
				str: query.aggregateAttribute.key,
				prefix: query.aggregateAttribute.type || '',
				condition: !query.aggregateAttribute.isColumn,
			}),
		[query],
	);

	const placeholder: string =
		query.dataSource === DataSource.METRICS
			? `${transformToUpperCase(query.dataSource)} name`
			: 'Aggregate attribute';

	return (
		<AutoComplete
			placeholder={placeholder}
			style={selectStyle}
			showArrow={false}
			filterOption={false}
			notFoundContent={isFetching ? <Spin size="small" /> : null}
			options={optionsData}
			value={value}
			onChange={handleChangeAttribute}
			disabled={disabled}
		/>
	);
});
