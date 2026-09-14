import { useEffect, useRef, useState } from 'react';
import { Select, Spin } from 'antd';
import { useFieldKeysSuggestion } from 'hooks/querySuggestions/useFieldKeysSuggestion';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';
import { FieldSuggestionsConfig } from 'types/fieldSuggestions';
import { DataSource } from 'types/common/queryBuilder';

import './ListViewOrderBy.styles.scss';

const DEFAULT_STATIC_FIELDS: TelemetryFieldKey[] = [
	{ name: 'timestamp' } as TelemetryFieldKey,
];

const DEFAULT_FIELD_SUGGESTIONS: FieldSuggestionsConfig = {};

interface ListViewOrderByProps {
	value: string;
	onChange: (value: string) => void;
	dataSource: DataSource;
	fieldSuggestions?: FieldSuggestionsConfig;
}

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
	fieldSuggestions = DEFAULT_FIELD_SUGGESTIONS,
}: ListViewOrderByProps): JSX.Element {
	const { staticFields = DEFAULT_STATIC_FIELDS, ...keysConfig } =
		fieldSuggestions;
	const [searchInput, setSearchInput] = useState('');
	const [debouncedInput, setDebouncedInput] = useState('');
	const [selectOptions, setSelectOptions] = useState<
		{ label: string; value: string }[]
	>([]);
	const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const { data, isLoading } = useFieldKeysSuggestion(
		keysConfig,
		dataSource,
		debouncedInput,
	);

	useEffect(
		() => (): void => {
			if (debounceTimer.current) {
				clearTimeout(debounceTimer.current);
			}
		},
		[],
	);

	const staticKeysSignature = staticFields.map((field) => field.name).join(',');

	useEffect(() => {
		const keyNames = (data ?? []).map((field) => field.name);
		const search = searchInput.trim().toLowerCase();
		const staticMatches = staticKeysSignature
			.split(',')
			.filter((key) => key.length > 0 && key.toLowerCase().includes(search));
		const uniqueKeys = [...new Set([...staticMatches, ...keyNames])];

		setSelectOptions(
			uniqueKeys.flatMap((key) => [
				{ label: `${key} (desc)`, value: `${key}:desc` },
				{ label: `${key} (asc)`, value: `${key}:asc` },
			]),
		);
	}, [data, searchInput, staticKeysSignature]);

	const handleSearch = (input: string): void => {
		setSearchInput(input);

		const filteredOptions = selectOptions.filter((option) =>
			option.value.toLowerCase().includes(input.trim().toLowerCase()),
		);

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
