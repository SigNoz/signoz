import './TracesQB.styles.scss';

import SpanScopeSelector from 'container/QueryBuilder/filters/QueryBuilderSearchV2/SpanScopeSelector';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import QueryAddOns from '../QueryAddOns/QueryAddOns';
import QueryAggregation from '../QueryAggregation/QueryAggregation';
import QuerySearch from '../QuerySearch/QuerySearch';

function TracesQB({ query }: { query: IBuilderQuery }): JSX.Element {
	return (
		<div className="traces-qb">
			<div className="traces-search-filter-container">
				<QuerySearch />
				<div className="traces-search-filter-in">in</div>
				<SpanScopeSelector queryName={query.queryName} />
			</div>
			<QueryAggregation source={DataSource.TRACES} />
			<QueryAddOns query={query} version="v3" isListViewPanel={false} />
		</div>
	);
}

export default TracesQB;
