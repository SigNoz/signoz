import './MetricsQB.styles.scss';

import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import QueryAddOns from '../QueryAddOns/QueryAddOns';
import QuerySearch from '../QuerySearch/QuerySearch';
import MetricsAggregateSection from './MerticsAggregateSection/MetricsAggregateSection';
import { MetricsSelect } from './MetricsSelect/MetricsSelect';

function MetricsQB({ query }: { query: IBuilderQuery }): JSX.Element {
	return (
		<div className="metrics-qb">
			<MetricsSelect query={query} index={0} version="v4" />
			<QuerySearch />
			<MetricsAggregateSection query={query} index={0} version="v4" />
			<QueryAddOns query={query} version="v3" isListViewPanel={false} />
		</div>
	);
}

export default MetricsQB;
