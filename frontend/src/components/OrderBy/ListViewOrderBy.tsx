import { useEffect, useRef, useState } from 'react';
import { Select, Spin } from 'antd';
import {
	FieldKeysConfig,
	useFieldKeys,
} from 'hooks/querySuggestions/fieldKeys';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';
import { DataSource } from 'types/common/queryBuilder';

import './ListViewOrderBy.styles.scss';

const DEFAULT_ORDER_BY_KEYS: FieldKeysConfig = {
	staticFields: [{ name: 'timestamp' } as TelemetryFieldKey],
};

interface ListViewOrderByProps {
	value: string;
	onChange: (value: string) => void;
	dataSource: DataSource;
	fieldKeysConfig?: FieldKeysConfig;
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
	fieldKeysConfig = DEFAULT_ORDER_BY_KEYS,
}: ListViewOrderByProps): JSX.Element {
	const [searchInput, setSearchInput] = useState('');
	const [debouncedInput, setDebouncedInput] = useState('');
	const [selectOptions, setSelectOptions] = useState<
		{ label: string; value: string }[]
	>([]);
	const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const { data, isLoading } = useFieldKeys(
		fieldKeysConfig,
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

	const staticKeysSignature = (fieldKeysConfig.staticFields ?? [])
		.map((field) => field.name)
		.join(',');

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
