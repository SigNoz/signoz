import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Select, Spin } from 'antd';
import { TelemetrytypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
// ** Constants
import { DEBOUNCE_DELAY } from 'constants/queryBuilderFilterConfig';
import { useFieldKeyOptions } from 'hooks/querySuggestions/useFieldKeyOptions';
import useDebounce from 'hooks/useDebounce';
// ** Components
// ** Helpers
import { isEqual, uniqWith } from 'lodash-es';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { MetricAggregation } from 'types/api/v5/queryRange';
import { DATA_SOURCE_TO_SIGNAL, DataSource } from 'types/common/queryBuilder';
import { getFieldContextPrefix } from 'utils/fieldKeyContext';
import { SelectOption } from 'types/common/select';
import { useSelectPopupContainer } from 'utils/selectPopupContainer';

import { selectStyle } from '../config';
import { GroupByFilterProps } from './GroupByFilter.interfaces';
import { getGroupByData } from './utils';

export const GroupByFilter = memo(function GroupByFilter({
	query,
	onChange,
	disabled,
	signalSource,
}: GroupByFilterProps): JSX.Element {
	const getPopupContainer = useSelectPopupContainer();
	const [searchText, setSearchText] = useState<string>('');
	const [localValues, setLocalValues] = useState<SelectOption<string, string>[]>(
		[],
	);
	const [isFocused, setIsFocused] = useState<boolean>(false);

	const debouncedValue = useDebounce(searchText, DEBOUNCE_DELAY);

	const metricName =
		query.dataSource === DataSource.METRICS
			? query.aggregateAttribute?.key ||
				(query.aggregations?.[0] as MetricAggregation)?.metricName
			: undefined;

	// Suggestions carry bare names; a stored key may carry a typed context prefix.
	const selectedNames = useMemo(
		() =>
			query.groupBy.map(
				(item) => getFieldContextPrefix(item.key)?.remainder ?? item.key,
			),
		[query.groupBy],
	);

	const { options, isFetching } = useFieldKeyOptions({
		fieldKeysConfig: {
			signal: DATA_SOURCE_TO_SIGNAL[query.dataSource],
			source: signalSource === 'meter' ? TelemetrytypesSourceDTO.meter : undefined,
			metricName: metricName || undefined,
			searchText: debouncedValue,
		},
		builderQueryType: query.builderQueryType,
		enabled: !disabled && isFocused,
		excludeNames: selectedNames,
	});

	const optionsData = useMemo(
		() => options.map(({ label }) => ({ label, value: label })),
		[options],
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

	const handleChange = useCallback(
		(values: SelectOption<string, string>[]): void => {
			const groupByValues: BaseAutocompleteData[] = values.map((item) => {
				const existing = query.groupBy.find(
					(groupByItem) =>
						groupByItem.id === item.value || groupByItem.key === item.value,
				);

				return existing ?? getGroupByData(item.value);
			});

			onChange(uniqWith(groupByValues, isEqual));
		},
		[onChange, query.groupBy],
	);

	const clearSearch = useCallback(() => {
		setSearchText('');
	}, []);

	useEffect(() => {
		const currentValues: SelectOption<string, string>[] =
			query.groupBy?.map((item) => ({
				label: `${item.key}`,
				value: `${item.id}`,
			})) || [];

		setLocalValues(currentValues);
	}, [query]);

	return (
		<Select
			getPopupContainer={getPopupContainer}
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
			placeholder={localValues?.length === 0 ? 'Everything (no breakdown)' : ''}
		/>
	);
});
