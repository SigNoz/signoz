import { useEffect, useRef, useState } from 'react';
import { useQuery } from 'react-query';
import { Select, Spin } from 'antd';
import type { TelemetrytypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas';
import {
	fetchFieldKeysForQuery,
	SuggestedFieldKey,
} from 'api/querySuggestions/fieldSuggestions';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import './ListViewOrderBy.styles.scss';

const DEFAULT_STATIC_OPTION_KEYS = ['timestamp'];

interface ListViewOrderByProps {
	value: string;
	onChange: (value: string) => void;
	dataSource: DataSource;
	/** Picks the key endpoint; builder_ai_query reads ai_observability. */
	builderQueryType?: IBuilderQuery['builderQueryType'];
	fieldContext?: TelemetrytypesFieldContextDTO;
	/** Keys always offered, on top of whatever the endpoint reports. */
	staticOptionKeys?: string[];
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
	builderQueryType,
	fieldContext,
	staticOptionKeys = DEFAULT_STATIC_OPTION_KEYS,
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
			builderQueryType,
			fieldContext,
			debouncedInput,
		],
		queryFn: async () => {
			const response = await fetchFieldKeysForQuery({
				builderQueryType,
				dataSource,
				fieldContext,
				searchText: debouncedInput,
			});

			return response.data.data?.keys;
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

	// A signature, not the array: an inline literal would loop the effect below.
	const staticKeysSignature = staticOptionKeys.join(',');

	// Update options when API data changes
	useEffect(() => {
		const rawKeys: SuggestedFieldKey[] = data ? Object.values(data).flat() : [];

		const keyNames = rawKeys.map((key) => key.name);
		// Static keys survive a search; the endpoint never reports them.
		const search = searchInput.trim().toLowerCase();
		const staticMatches = staticKeysSignature
			.split(',')
			.filter((key) => key.length > 0 && key.toLowerCase().includes(search));
		const uniqueKeys = [...new Set([...staticMatches, ...keyNames])];

		const updatedOptions = uniqueKeys.flatMap((key) => [
			{ label: `${key} (desc)`, value: `${key}:desc` },
			{ label: `${key} (asc)`, value: `${key}:asc` },
		]);

		setSelectOptions(updatedOptions);
	}, [data, searchInput, staticKeysSignature]);

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

ListViewOrderBy.defaultProps = {
	builderQueryType: undefined,
	fieldContext: undefined,
	staticOptionKeys: DEFAULT_STATIC_OPTION_KEYS,
};

export default ListViewOrderBy;
