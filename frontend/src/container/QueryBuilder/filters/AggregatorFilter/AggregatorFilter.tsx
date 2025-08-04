// ** Components
import { AutoComplete, Spin } from 'antd';
// ** Api
import { getAggregateAttribute } from 'api/queryBuilder/getAggregateAttribute';
import {
	baseAutoCompleteIdKeysOrder,
	QueryBuilderKeys,
	selectValueDivider,
} from 'constants/queryBuilder';
import { DEBOUNCE_DELAY } from 'constants/queryBuilderFilterConfig';
import useDebounce from 'hooks/useDebounce';
import { createIdFromObjectFields } from 'lib/createIdFromObjectFields';
import { chooseAutocompleteFromCustomValue } from 'lib/newQueryBuilder/chooseAutocompleteFromCustomValue';
import { getAutocompleteValueAndType } from 'lib/newQueryBuilder/getAutocompleteValueAndType';
import { transformStringWithPrefix } from 'lib/query/transformStringWithPrefix';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { SuccessResponse } from 'types/api';
import {
	BaseAutocompleteData,
	IQueryAutocompleteResponse,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { MetricAggregation } from 'types/api/v5/queryRange';
import { DataSource } from 'types/common/queryBuilder';
import { ExtendedSelectOption } from 'types/common/select';
import { popupContainer } from 'utils/selectPopupContainer';

import { removePrefix } from '../GroupByFilter/utils';
import { selectStyle } from '../QueryBuilderSearch/config';
import OptionRenderer from '../QueryBuilderSearch/OptionRenderer';
// ** Types
import { AgregatorFilterProps } from './AggregatorFilter.intefaces';

export const AggregatorFilter = memo(function AggregatorFilter({
	query,
	disabled,
	onChange,
	defaultValue,
	onSelect,
	index,
}: AgregatorFilterProps): JSX.Element {
	const queryClient = useQueryClient();
	const [optionsData, setOptionsData] = useState<ExtendedSelectOption[]>([]);
	const [searchText, setSearchText] = useState<string>('');

	// this function is only relevant for metrics and now operators are part of aggregations
	const queryAggregation = useMemo(
		() => query.aggregations?.[0] as MetricAggregation,
		[query.aggregations],
	);

	const debouncedSearchText = useMemo(() => {
		// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-unused-vars
		const [_, value] = getAutocompleteValueAndType(searchText);

		return value;
	}, [searchText]);

	const debouncedValue = useDebounce(debouncedSearchText, DEBOUNCE_DELAY);
	const { isFetching, data: aggregateAttributeData } = useQuery(
		[
			QueryBuilderKeys.GET_AGGREGATE_ATTRIBUTE,
			debouncedValue,
			queryAggregation.timeAggregation,
			query.dataSource,
			index,
		],
		async () =>
			getAggregateAttribute({
				searchText: debouncedValue,
				aggregateOperator: queryAggregation.timeAggregation,
				dataSource: query.dataSource,
			}),
		{
			enabled:
				query.dataSource === DataSource.METRICS ||
				(!!queryAggregation.timeAggregation && !!query.dataSource),
			onSuccess: (data) => {
				const options: ExtendedSelectOption[] =
					data?.payload?.attributeKeys?.map(({ id: _, ...item }) => ({
						label: (
							<OptionRenderer
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
								dataType={item.dataType}
								type={item.type || ''}
							/>
						),
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

	// Handle edit mode: update aggregateAttribute type when data is available
	useEffect(() => {
		const metricName = queryAggregation?.metricName;
		const hasAggregateAttributeType = query.aggregateAttribute?.type;

		// Check if we're in edit mode and have data from the existing query
		// Also ensure this is for the correct query by checking the metric name matches
		if (
			query.dataSource === DataSource.METRICS &&
			metricName &&
			!hasAggregateAttributeType &&
			aggregateAttributeData?.payload?.attributeKeys &&
			// Only update if the data contains the metric we're looking for
			aggregateAttributeData.payload.attributeKeys.some(
				(item) => item.key === metricName,
			)
		) {
			const metricData = aggregateAttributeData.payload.attributeKeys.find(
				(item) => item.key === metricName,
			);

			if (metricData) {
				// Update the aggregateAttribute with the fetched type information
				onChange(metricData);
			}
		}
	}, [
		query.dataSource,
		queryAggregation?.metricName,
		query.aggregateAttribute?.type,
		aggregateAttributeData,
		onChange,
		index,
		query,
	]);

	const handleSearchText = useCallback((text: string): void => {
		setSearchText(text);
	}, []);

	const placeholder: string =
		query.dataSource === DataSource.METRICS
			? `Search metric name`
			: 'Aggregate attribute';

	const getAttributesData = useCallback(
		(): BaseAutocompleteData[] =>
			queryClient.getQueryData<SuccessResponse<IQueryAutocompleteResponse>>([
				QueryBuilderKeys.GET_AGGREGATE_ATTRIBUTE,
				debouncedValue,
				queryAggregation.timeAggregation,
				query.dataSource,
				index,
			])?.payload?.attributeKeys || [],
		[
			debouncedValue,
			queryAggregation.timeAggregation,
			query.dataSource,
			queryClient,
			index,
		],
	);

	const getResponseAttributes = useCallback(async () => {
		const response = await queryClient.fetchQuery(
			[
				QueryBuilderKeys.GET_AGGREGATE_ATTRIBUTE,
				searchText,
				queryAggregation.timeAggregation,
				query.dataSource,
				index,
			],
			async () =>
				getAggregateAttribute({
					searchText,
					aggregateOperator: queryAggregation.timeAggregation,
					dataSource: query.dataSource,
				}),
		);

		return response.payload?.attributeKeys || [];
	}, [
		queryAggregation.timeAggregation,
		query.dataSource,
		queryClient,
		searchText,
		index,
	]);

	const handleChangeCustomValue = useCallback(
		async (value: string, attributes: BaseAutocompleteData[]) => {
			const customAttribute: BaseAutocompleteData = chooseAutocompleteFromCustomValue(
				attributes,
				value,
			);

			onChange(customAttribute);
		},
		[onChange],
	);

	const handleBlur = useCallback(async () => {
		if (searchText) {
			const aggregateAttributes = await getResponseAttributes();
			handleChangeCustomValue(searchText, aggregateAttributes);
		}
	}, [getResponseAttributes, handleChangeCustomValue, searchText]);

	const handleChange = useCallback(
		(
			value: string,
			option: ExtendedSelectOption | ExtendedSelectOption[],
		): void => {
			const currentOption = option as ExtendedSelectOption;

			const aggregateAttributes = getAttributesData();

			if (currentOption.key) {
				const attribute = aggregateAttributes.find(
					(item) => item.id === currentOption.key,
				);

				if (attribute) {
					onChange(attribute);
				}
			} else {
				handleChangeCustomValue(value, aggregateAttributes);
			}

			setSearchText('');
		},
		[getAttributesData, handleChangeCustomValue, onChange],
	);

	const handleSelect = useCallback(
		(_: string, option: ExtendedSelectOption | ExtendedSelectOption[]): void => {
			const currentOption = option as ExtendedSelectOption;

			const aggregateAttributes = getAttributesData();

			if (currentOption.key) {
				const attribute = aggregateAttributes.find(
					(item) => item.id === currentOption.key,
				);

				if (attribute && onSelect) {
					onSelect(attribute);
				}
			}

			setSearchText('');
		},
		[getAttributesData, onSelect],
	);

	const value = removePrefix(
		transformStringWithPrefix({
			str:
				(query.aggregations?.[0] as MetricAggregation)?.metricName ||
				query.aggregateAttribute?.key ||
				'',
			prefix: query.aggregateAttribute?.type || '',
			condition: !query.aggregateAttribute?.isColumn,
		}),
		!query.aggregateAttribute?.isColumn && query.aggregateAttribute?.type
			? query.aggregateAttribute?.type
			: '',
	);

	return (
		<AutoComplete
			getPopupContainer={popupContainer}
			placeholder={placeholder}
			style={selectStyle}
			filterOption={false}
			onSearch={handleSearchText}
			notFoundContent={isFetching ? <Spin size="small" /> : null}
			options={optionsData}
			value={defaultValue || value}
			onBlur={handleBlur}
			onChange={handleChange}
			disabled={disabled}
			onSelect={handleSelect}
		/>
	);
});
