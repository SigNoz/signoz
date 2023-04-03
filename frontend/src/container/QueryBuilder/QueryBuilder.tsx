// ** Hooks
import { useQueryBuilder } from 'hooks/useQueryBuilder';
import React from 'react';

// ** Components
import { Query } from './components';
// ** Types
import { QueryBuilderProps } from './QueryBuilder.interfaces';

// TODO: I think it can be components switcher, because if we have different views based on the data source, we can render based on source
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function QueryBuilder({ config }: QueryBuilderProps): JSX.Element {
	const { queryBuilderData } = useQueryBuilder();

	// Here we can use Form from antd library and fill context data or edit
	// Connect form with adding or removing items from the list

	// Here will be map of query queryBuilderData.queryData and queryBuilderData.queryFormulas components
	// Each component can be part of antd Form list where we can add or remove items
	// Also need decide to make a copy of queryData for working with form or not and after it set the full new list with formulas or queries to the context
	// With button to add him
	return (
		<div>
			{queryBuilderData.queryData.map((query, index) => (
				<Query
					key={query.queryName}
					index={index}
					isAvailableToDisable={queryBuilderData.queryData.length > 1}
					queryVariant={config?.queryVariant || 'dropdown'}
					query={query}
				/>
			))}
		</div>
	);
}
