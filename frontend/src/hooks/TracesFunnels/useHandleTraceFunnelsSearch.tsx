import { ChangeEvent, useState } from 'react';

const useHandleTraceFunnelsSearch = (): {
	searchQuery: string;
	handleSearch: (e: ChangeEvent<HTMLInputElement>) => void;
} => {
	const [searchQuery, setSearchQuery] = useState<string>('');

	const handleSearch = (e: ChangeEvent<HTMLInputElement>): void => {
		setSearchQuery(e.target.value);
	};

	return {
		searchQuery,
		handleSearch,
	};
};

export default useHandleTraceFunnelsSearch;
