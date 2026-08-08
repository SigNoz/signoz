import { useEffect, useRef, useState } from 'react';
import { useQuery } from 'react-query';
import { Select, Spin } from 'antd';
import { getKeySuggestions } from 'api/querySuggestions/getKeySuggestions';
import {
	QueryKeyDataSuggestionsProps,
	QueryKeyRequestProps,
} from 'types/api/querySuggestions/types';
import { DataSource } from 'types/common/queryBuilder';

import './ListViewOrderBy.styles.scss';

interface ListViewOrderByProps {
	value: string;
	onChange: (value: string) => void;
	dataSource: DataSource;
	/**
	 * Narrows the key suggestions to one context, e.g. `trace` to offer only
	 * trace-level aggregates. Omit to offer every key for `dataSource`.
	 */
	fieldContext?: QueryKeyRequestProps['fieldContext'];
	/**
	 * Key prepended to the options when the search box is empty, so the caller's
	 * primary sort field is reachable in one click. Defaults to `timestamp`.
	 */
	seedKey?: string;
	/**
	 * Query type the keys must be valid for, e.g. `builder_ai_query`. Omit for the
	 * default builder query.
	 */
	queryType?: string;
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
	fieldContext,
	seedKey = 'timestamp',
	queryType,
}: ListViewOrderByProps): JSX.Element {
	const [searchInput, setSearchInput] = useState('');
	const [debouncedInput, setDebouncedInput] = useState('');
	const [selectOptions, setSelectOptions] = useState<
		{ label: string; value: string }[]
	>([]);
	const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Fetch key suggestions based on debounced input
	const { data, isLoading } = useQuery({
		queryKey: [
			'orderByKeySuggestions',
			dataSource,
			debouncedInput,
			fieldContext,
			queryType,
		],
		queryFn: async () => {
			const response = await getKeySuggestions({
				signal: dataSource,
				searchText: debouncedInput,
				fieldContext,
				type: queryType,
			});
			return response.data;
		},
	});

	useEffect(
		() => (): void => {
			if (debounceTimer.current) {
				clearTimeout(debounceTimer.current);
			}
		},
		[],
	);

	// Update options when API data changes
	useEffect(() => {
		const rawKeys: QueryKeyDataSuggestionsProps[] = data?.data?.keys
			? Object.values(data.data?.keys).flat()
			: [];

		const keyNames = rawKeys.map((key) => key.name);
		const uniqueKeys = [
			...new Set(searchInput ? keyNames : [seedKey, ...keyNames]),
		];

		const updatedOptions = uniqueKeys.flatMap((key) => [
			{ label: `${key} (desc)`, value: `${key}:desc` },
			{ label: `${key} (asc)`, value: `${key}:asc` },
		]);

		setSelectOptions(updatedOptions);
	}, [data, searchInput, seedKey]);

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
