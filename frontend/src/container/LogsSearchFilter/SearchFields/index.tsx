import React from 'react';

import QueryBuilder from './QueryBuilder/QueryBuilder';
import Suggestions from './Suggestions';
import { QueryFields } from './utils';

export interface SearchFieldsProps {
	updateParsedQuery: (query: QueryFields[]) => void;
	onDropDownToggleHandler: (value: boolean) => VoidFunction;
}

function SearchFields({
	updateParsedQuery,
	onDropDownToggleHandler,
}: SearchFieldsProps): JSX.Element {
	return (
		<>
			<QueryBuilder
				onDropDownToggleHandler={onDropDownToggleHandler}
				updateParsedQuery={updateParsedQuery}
			/>
			<Suggestions />
		</>
	);
}
export default SearchFields;
