import './MetricsSelect.styles.scss';

import { AggregatorFilter } from 'container/QueryBuilder/filters';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { memo } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

export const MetricsSelect = memo(function MetricsSelect({
	query,
	index,
	version,
}: {
	query: IBuilderQuery;
	index: number;
	version: string;
}): JSX.Element {
	const { handleChangeAggregatorAttribute } = useQueryOperations({
		index,
		query,
		entityVersion: version,
	});

	return (
		<div className="metrics-select-container">
			<AggregatorFilter
				onChange={handleChangeAggregatorAttribute}
				query={query}
				index={index}
			/>
		</div>
	);
});
