// ** Hooks
import { useQueryBuilder } from 'hooks/useQueryBuilder';
import React from 'react';

// ** Types
import { QueryBuilderProps } from './QueryBuilder.interfaces';

// TODO: temporary eslint disable while variable isn't used
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function QueryBuilder(props: QueryBuilderProps): JSX.Element {
	// TODO: temporary doesn't use
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { queryBuilderData } = useQueryBuilder();

	// Here we can use Form from antd library and fill context data or edit
	// Connect form with adding or removing items from the list

	// Here will be map of query queryBuilderData.queryData and queryBuilderData.queryFormulas components
	// Each component can be part of antd Form list where we can add or remove items
	// Also need decide to make a copy of queryData for working with form or not and after it set the full new list with formulas or queries to the context
	// With button to add him
	return <div>null</div>;
}
