import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { ChangeEvent, useState } from 'react';

const useHandleTraceFunnelsSearch = (): {
	searchQuery: string;
	handleSearch: (e: ChangeEvent<HTMLInputElement>) => void;
} => {
	const { safeNavigate } = useSafeNavigate();

	const urlQuery = useUrlQuery();
	const [searchQuery, setSearchQuery] = useState<string>(
		urlQuery.get('search') || '',
	);

	const handleSearch = (e: ChangeEvent<HTMLInputElement>): void => {
		const { value } = e.target;
		setSearchQuery(value);

		if (value) {
			urlQuery.set('search', value);
		} else {
			urlQuery.delete('search');
		}

		safeNavigate({ search: urlQuery.toString() });
	};

	return {
		searchQuery,
		handleSearch,
	};
};

export default useHandleTraceFunnelsSearch;
