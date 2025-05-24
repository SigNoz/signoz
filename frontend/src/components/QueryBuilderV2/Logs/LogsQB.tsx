import './LogsQB.styles.scss';

import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import QueryAddOns from '../QueryAddOns/QueryAddOns';
import QueryAggregation from '../QueryAggregation/QueryAggregation';
import QuerySearch from '../QuerySearch/QuerySearch';

function LogsQB({ query }: { query: IBuilderQuery }): JSX.Element {
	return (
		<div className="logs-qb">
			<QuerySearch />
			<QueryAggregation source={DataSource.LOGS} />
			<QueryAddOns query={query} version="v3" isListViewPanel={false} />
		</div>
	);
}

export default LogsQB;
