import { useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { ComboboxSimple, ComboboxSimpleItem } from '@signozhq/ui/combobox';
import { getKeySuggestions } from 'api/querySuggestions/getKeySuggestions';
import { QueryKeyDataSuggestionsProps } from 'types/api/querySuggestions/types';
import { DataSource } from 'types/common/queryBuilder';

import './ListViewOrderBy.styles.scss';

interface ListViewOrderByProps {
	value: string;
	onChange: (value: string) => void;
	dataSource: DataSource;
}

function ListViewOrderBy({
	value,
	onChange,
	dataSource,
}: ListViewOrderByProps): JSX.Element {
	const [selectOptions, setSelectOptions] = useState<ComboboxSimpleItem[]>([]);

	// Fetch key suggestions once; ComboboxSimple handles local filtering.
	const { data, isLoading } = useQuery({
		queryKey: ['orderByKeySuggestions', dataSource],
		queryFn: async () => {
			const response = await getKeySuggestions({
				signal: dataSource,
				searchText: '',
			});
			return response.data;
		},
	});

	// Update options when API data changes
	useEffect(() => {
		const rawKeys: QueryKeyDataSuggestionsProps[] = data?.data?.keys
			? Object.values(data.data?.keys).flat()
			: [];

		const keyNames = rawKeys.map((key) => key.name);
		const uniqueKeys = [...new Set(['timestamp', ...keyNames])];

		const updatedOptions: ComboboxSimpleItem[] = uniqueKeys.flatMap((key) => [
			{ label: `${key} (desc)`, value: `${key}:desc` },
			{ label: `${key} (asc)`, value: `${key}:asc` },
		]);

		setSelectOptions(updatedOptions);
	}, [data]);

	const handleChange = useMemo(
		() =>
			(val: string | string[]): void => {
				onChange(val as string);
			},
		[onChange],
	);

	return (
		<ComboboxSimple
			value={value}
			onChange={handleChange}
			loading={isLoading}
			placeholder="Select a field"
			style={{ width: 200 }}
			items={selectOptions}
			emptyPlaceholder="No results found"
		/>
	);
}

export default ListViewOrderBy;
