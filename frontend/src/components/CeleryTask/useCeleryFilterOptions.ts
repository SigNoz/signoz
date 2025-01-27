import { DefaultOptionType } from 'antd/es/select';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { useState } from 'react';

import {
	FilterOptionType,
	useGetAllFilters,
} from './CeleryTaskConfigOptions/useGetCeleryFilters';

export const useCeleryFilterOptions = (
	type: FilterOptionType,
): {
	searchText: string;
	handleSearch: (value: string) => void;
	isFetching: boolean;
	options: DefaultOptionType[];
} => {
	const [searchText, setSearchText] = useState<string>('');
	const { isFetching, options } = useGetAllFilters({
		attributeKey: type,
		searchText,
	});
	const handleDebouncedSearch = useDebouncedFn((searchText): void => {
		setSearchText(searchText as string);
	}, 500);

	const handleSearch = (value: string): void => {
		handleDebouncedSearch(value || '');
	};

	return { searchText, handleSearch, isFetching, options };
};
