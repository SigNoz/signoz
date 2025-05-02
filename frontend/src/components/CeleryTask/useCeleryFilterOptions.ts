import { DefaultOptionType } from 'antd/es/select';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { useState } from 'react';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

import { useGetAllFilters } from './CeleryTaskConfigOptions/useGetCeleryFilters';

export const useCeleryFilterOptions = (
	type: string | string[],
	aggregateOperator?: string,
	dataSource?: DataSource,
	aggregateAttribute?: string,
	filterAttributeKeyDataType?: DataTypes,
	tagType?: string,
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
		aggregateOperator,
		dataSource,
		aggregateAttribute,
		filterAttributeKeyDataType,
		tagType,
	});
	const handleDebouncedSearch = useDebouncedFn((searchText): void => {
		setSearchText(searchText as string);
	}, 500);

	const handleSearch = (value: string): void => {
		handleDebouncedSearch(value || '');
	};

	return { searchText, handleSearch, isFetching, options };
};
