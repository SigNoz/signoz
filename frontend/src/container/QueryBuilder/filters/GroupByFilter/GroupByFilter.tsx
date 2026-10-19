import {
	memo,
	ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { Select, Spin } from 'antd';
// ** Constants
import { idDivider } from 'constants/queryBuilder';
import { DEBOUNCE_DELAY } from 'constants/queryBuilderFilterConfig';
import { useFieldKeysSuggestion } from 'hooks/querySuggestions/useFieldKeysSuggestion';
import useDebounce from 'hooks/useDebounce';
import { chooseAutocompleteFromCustomValue } from 'lib/newQueryBuilder/chooseAutocompleteFromCustomValue';
// ** Components
// ** Helpers
import { isEqual, uniqWith } from 'lodash-es';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	DATA_SOURCE_TO_SIGNAL,
	QUERY_SOURCE_TO_FIELD_SOURCE,
} from 'types/common/queryBuilder';
import { SelectOption } from 'types/common/select';
import { useSelectPopupContainer } from 'utils/selectPopupContainer';

import { selectStyle } from '../QueryBuilderSearchV2/config';
import { getMetricNameForQuery } from '../utils';
import OptionRenderer from '../OptionRenderer/OptionRenderer';
import { GroupByFilterProps } from './GroupByFilter.interfaces';
import { toAttributeKey } from './utils';

export const GroupByFilter = memo(function GroupByFilter({
	query,
	onChange,
	disabled,
	placeholder = 'Everything (no breakdown)',
}: GroupByFilterProps): JSX.Element {
	const getPopupContainer = useSelectPopupContainer();
	const [searchText, setSearchText] = useState<string>('');
	const [localValues, setLocalValues] = useState<SelectOption<string, string>[]>(
		[],
	);
	const [isFocused, setIsFocused] = useState<boolean>(false);

	const debouncedValue = useDebounce(searchText, DEBOUNCE_DELAY);

	const { data: fieldKeys, isFetching } = useFieldKeysSuggestion(
		{
			signal: DATA_SOURCE_TO_SIGNAL[query.dataSource],
			source: QUERY_SOURCE_TO_FIELD_SOURCE[query.source ?? ''],
			metricName: getMetricNameForQuery(query),
			searchText: debouncedValue,
		},
		query.builderQueryType,
		{ enabled: !disabled && isFocused, keepPreviousData: true },
	);

	const attributeKeys = useMemo(
		() => (fieldKeys ?? []).map(toAttributeKey),
		[fieldKeys],
	);

	const optionsData = useMemo((): SelectOption<string, ReactNode>[] => {
		const selectedKeys = new Set(query.groupBy.map((item) => item.key));

		return attributeKeys
			.filter((item) => !selectedKeys.has(item.key))
			.map((item) => ({
				label: (
					<OptionRenderer
						key={item.key}
						label={item.key}
						value={item.key}
						dataType={item.dataType || ''}
						type={item.type || ''}
					/>
				),
				value: `${item.id}`,
			}));
	}, [attributeKeys, query.groupBy]);

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
				const id = item.value;
				const currentValue = item.value.split(idDivider)[0];

				if (id && id.includes(idDivider)) {
					const attribute = attributeKeys.find((item) => item.id === id);
					const existAttribute = query.groupBy.find((item) => item.id === id);

					if (attribute) {
						return attribute;
					}

					if (existAttribute) {
						return existAttribute;
					}
				}

				return chooseAutocompleteFromCustomValue(attributeKeys, currentValue);
			});

			const result = uniqWith(groupByValues, isEqual);

			onChange(result);
		},
		[attributeKeys, onChange, query.groupBy],
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
			placeholder={localValues?.length === 0 ? placeholder : ''}
		/>
	);
});
