import { useState } from 'react';
import type { DefaultOptionType } from 'antd/es/select';
import type { TelemetrytypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas';
import useDebouncedFn from 'hooks/useDebouncedFunction';

import { useGetAllFilters } from './CeleryTaskConfigOptions/useGetCeleryFilters';

export const useCeleryFilterOptions = (
	type: string | string[],
	fieldContext?: TelemetrytypesFieldContextDTO,
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
		fieldContext,
	});
	const handleDebouncedSearch = useDebouncedFn((searchText): void => {
		setSearchText(searchText as string);
	}, 500);

	const handleSearch = (value: string): void => {
		handleDebouncedSearch(value || '');
	};

	return { searchText, handleSearch, isFetching, options };
};
