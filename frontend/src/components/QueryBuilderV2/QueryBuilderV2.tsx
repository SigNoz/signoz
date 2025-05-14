import './QueryBuilderV2.styles.scss';

import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useState } from 'react';

import QueryAddOns from './QueryAddOns/QueryAddOns';
import QueryAggregation from './QueryAggregation/QueryAggregation';
import QuerySearch from './QuerySearch/QuerySearch';

function QueryBuilderV2(): JSX.Element {
	const { currentQuery } = useQueryBuilder();

	const [selectedAggreateOptions, setSelectedAggreateOptions] = useState<
		{ func: string; arg: string }[]
	>([]);

	console.log('selectedAggreateOptions', selectedAggreateOptions);

	return (
		<div className="query-builder-v2">
			<QuerySearch />
			<QueryAggregation
				onAggregationOptionsSelect={(pairs): void => {
					setSelectedAggreateOptions(pairs);
				}}
			/>
			<QueryAddOns
				query={currentQuery.builder.queryData[0]}
				version="v3"
				isListViewPanel={false}
				selectedAggreateOptions={selectedAggreateOptions}
			/>
		</div>
	);
}

export default QueryBuilderV2;
