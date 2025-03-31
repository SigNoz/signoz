import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { debounce } from 'lodash-es';
import { ChangeEvent, useCallback, useState } from 'react';

const useHandleTraceFunnelsSearch = (): {
	searchQuery: string;
	handleSearch: (e: ChangeEvent<HTMLInputElement>) => void;
} => {
	const { safeNavigate } = useSafeNavigate();
	const urlQuery = useUrlQuery();
	const [searchQuery, setSearchQuery] = useState<string>(
		urlQuery.get('search') || '',
	);

	// eslint-disable-next-line react-hooks/exhaustive-deps
	const debouncedUpdateUrl = useCallback(
		debounce((value: string) => {
			const trimmedValue = value.trim();

			if (trimmedValue) {
				urlQuery.set('search', trimmedValue);
			} else {
				urlQuery.delete('search');
			}

			safeNavigate({ search: urlQuery.toString() });
		}, 300),
		[],
	);

	const handleSearch = (e: ChangeEvent<HTMLInputElement>): void => {
		const { value } = e.target;
		setSearchQuery(value);
		debouncedUpdateUrl(value);
	};

	return {
		searchQuery,
		handleSearch,
	};
};

export default useHandleTraceFunnelsSearch;
