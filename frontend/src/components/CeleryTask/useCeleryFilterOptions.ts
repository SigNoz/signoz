import { useState } from 'react';
import type { DefaultOptionType } from 'antd/es/select';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

import { useGetAllFilters } from './CeleryTaskConfigOptions/useGetCeleryFilters';

export const useCeleryFilterOptions = (
	type: string | string[],
	dataSource?: DataSource,
	metricName?: string,
	filterAttributeKeyDataType?: DataTypes,
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
		dataSource,
		metricName,
		filterAttributeKeyDataType,
	});
	const handleDebouncedSearch = useDebouncedFn((searchText): void => {
		setSearchText(searchText as string);
	}, 500);

	const handleSearch = (value: string): void => {
		handleDebouncedSearch(value || '');
	};

	return { searchText, handleSearch, isFetching, options };
};
