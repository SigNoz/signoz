import React from 'react';
import QueryBuilder from './QueryBuilder/QueryBuilder';
import Suggestions from './Suggestions';

function SearchFields({updateParsedQuery}): JSX.Element {

	return (
		<>
			<QueryBuilder updateParsedQuery={updateParsedQuery} />
			<Suggestions />
		</>
	);
}
export default SearchFields;
