import React from 'react';

import QueryBuilder from './QueryBuilder/QueryBuilder';
import Suggestions from './Suggestions';

interface SearchFieldsProps {
	updateParsedQuery: () => void;
}
function SearchFields({ updateParsedQuery }: SearchFieldsProps): JSX.Element {
	return (
		<>
			<QueryBuilder updateParsedQuery={updateParsedQuery} />
			<Suggestions />
		</>
	);
}
export default SearchFields;
