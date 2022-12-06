import React from 'react';

import QueryBuilder from './QueryBuilder/QueryBuilder';
import Suggestions from './Suggestions';

export interface SearchFieldsProps {
	onDropDownToggleHandler: (value: boolean) => VoidFunction;
}

function SearchFields({
	onDropDownToggleHandler,
}: SearchFieldsProps): JSX.Element {
	return (
		<>
			<QueryBuilder onDropDownToggleHandler={onDropDownToggleHandler} />
			<Suggestions />
		</>
	);
}
export default SearchFields;
