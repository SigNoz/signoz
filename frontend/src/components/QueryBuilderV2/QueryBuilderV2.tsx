import './QueryBuilderV2.styles.scss';

import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';

import QueryAddOns from './QueryAddOns/QueryAddOns';
import QueryAggregation from './QueryAggregation/QueryAggregation';
import QuerySearch from './QuerySearch/QuerySearch';

function QueryBuilderV2(): JSX.Element {
	const { currentQuery } = useQueryBuilder();

	return (
		<div className="query-builder-v2">
			<QuerySearch />
			<QueryAggregation />
			<QueryAddOns
				query={currentQuery.builder.queryData[0]}
				version="v3"
				isListViewPanel={false}
			/>
		</div>
	);
}

export default QueryBuilderV2;
