import { Select } from 'antd';
import { getKeySuggestions } from 'api/querySuggestions/getKeySuggestions';
import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { QueryKeyDataSuggestionsProps } from 'types/api/querySuggestions/types';
import { DataSource } from 'types/common/queryBuilder';

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
	const [searchText, setSearchText] = useState('');

	const { data } = useQuery(
		['orderByKeySuggestions', dataSource, searchText],
		async () => {
			const response = await getKeySuggestions({
				signal: dataSource,
				searchText,
			});
			return response.data;
		},
	);

	const options = useMemo(() => {
		const keys: QueryKeyDataSuggestionsProps[] = data?.data.keys
			? Object.values(data.data.keys).flat()
			: [];

		let displayKeys: string[];

		if (searchText) {
			displayKeys = [...new Set(keys.map((k) => k.name))];
		} else {
			displayKeys = [
				'timestamp',
				...keys.map((k) => k.name).filter((k) => k !== 'timestamp'),
			];
		}

		return displayKeys.flatMap((key) => [
			{ label: `${key} (desc)`, value: `${key}:desc` },
			{ label: `${key} (asc)`, value: `${key}:asc` },
		]);
	}, [data, searchText]);

	return (
		<Select
			showSearch
			value={value}
			onChange={onChange}
			onSearch={setSearchText}
			placeholder="Select an attribute"
			style={{ width: 200 }}
			options={options}
			filterOption={false}
		/>
	);
}

export default ListViewOrderBy;
