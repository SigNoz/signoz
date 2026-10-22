import { useEffect, useRef, useState } from 'react';
import { Select, Spin } from 'antd';
import { FieldKeysConfigProp } from 'api/querySuggestions/types';
import { useFieldKeysSuggestion } from 'hooks/querySuggestions/useFieldKeysSuggestion';
import { BuilderQueryType, TelemetryFieldKey } from 'types/api/v5/queryRange';
import { DATA_SOURCE_TO_SIGNAL, DataSource } from 'types/common/queryBuilder';

import './ListViewOrderBy.styles.scss';

const DEFAULT_EXTRA_FIELDS: TelemetryFieldKey[] = [
	{ name: 'timestamp' } as TelemetryFieldKey,
];

interface ListViewOrderByProps {
	value: string;
	onChange: (value: string) => void;
	dataSource: DataSource;
	fieldKeysConfig?: FieldKeysConfigProp;
	builderQueryType?: BuilderQueryType;
	extraFields?: TelemetryFieldKey[];
}

// Loader component for the dropdown when loading or no results
function Loader({ isLoading }: { isLoading: boolean }): JSX.Element {
	return (
		<div className="order-by-loading-container">
			{isLoading ? <Spin size="default" /> : 'No results found'}
		</div>
	);
}

function ListViewOrderBy({
	value,
	onChange,
	dataSource,
	fieldKeysConfig,
	builderQueryType,
	extraFields = DEFAULT_EXTRA_FIELDS,
}: ListViewOrderByProps): JSX.Element {
	const [searchInput, setSearchInput] = useState('');
	const [debouncedInput, setDebouncedInput] = useState('');
	const [selectOptions, setSelectOptions] = useState<
		{ label: string; value: string }[]
	>([]);
	const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const { data, isLoading } = useFieldKeysSuggestion(
		{
			...fieldKeysConfig,
			signal: DATA_SOURCE_TO_SIGNAL[dataSource],
			searchText: debouncedInput,
		},
		builderQueryType,
	);

	useEffect(
		() => (): void => {
			if (debounceTimer.current) {
				clearTimeout(debounceTimer.current);
			}
		},
		[],
	);

	const extraKeysSignature = extraFields.map((field) => field.name).join(',');

	// Update options when API data changes
	useEffect(() => {
		const keyNames = (data ?? []).map((field) => field.name);
		const search = searchInput.trim().toLowerCase();
		const extraMatches = extraKeysSignature
			.split(',')
			.filter((key) => key.length > 0 && key.toLowerCase().includes(search));
		const uniqueKeys = [...new Set([...extraMatches, ...keyNames])];

		setSelectOptions(
			uniqueKeys.flatMap((key) => [
				{ label: `${key} (desc)`, value: `${key}:desc` },
				{ label: `${key} (asc)`, value: `${key}:asc` },
			]),
		);
	}, [data, searchInput, extraKeysSignature]);

	// Handle search input with debounce
	const handleSearch = (input: string): void => {
		setSearchInput(input);

		// Filter current options for instant client-side match
		const filteredOptions = selectOptions.filter((option) =>
			option.value.toLowerCase().includes(input.trim().toLowerCase()),
		);

		// If no match found or input is empty, trigger debounced fetch
		if (filteredOptions.length === 0 || input === '') {
			if (debounceTimer.current) {
				clearTimeout(debounceTimer.current);
			}

			debounceTimer.current = setTimeout(() => {
				setDebouncedInput(input);
			}, 100);
		}
	};

	return (
		<Select
			showSearch
			value={value}
			onChange={onChange}
			onSearch={handleSearch}
			notFoundContent={<Loader isLoading={isLoading} />}
			placeholder="Select a field"
			style={{ width: 200 }}
			options={selectOptions}
			filterOption={(input, option): boolean =>
				(option?.value ?? '').toLowerCase().includes(input.trim().toLowerCase())
			}
		/>
	);
}

export default ListViewOrderBy;
