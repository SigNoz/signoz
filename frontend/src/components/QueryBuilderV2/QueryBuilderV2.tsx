import './QueryBuilderV2.styles.scss';

import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import MetricsAggregateSection from './Metrics/MerticsAggregateSection/MetricsAggregateSection';
import { MetricsSelect } from './Metrics/MetricsSelect/MetricsSelect';
import QueryAddOns from './QueryAddOns/QueryAddOns';
import QueryAggregation from './QueryAggregation/QueryAggregation';
import { QueryBuilderV2Provider } from './QueryBuilderV2Context';
import QuerySearch from './QuerySearch/QuerySearch';

type QueryBuilderV2Props = {
	source: DataSource;
	query: IBuilderQuery;
};

function QueryBuilderV2Main({
	source,
	query,
}: QueryBuilderV2Props): JSX.Element {
	const isMetricsDataSource = query.dataSource === DataSource.METRICS;

	return (
		<div className="query-builder-v2">
			{isMetricsDataSource && (
				<MetricsSelect query={query} index={0} version="v4" />
			)}

			<QuerySearch />

			{isMetricsDataSource ? (
				<MetricsAggregateSection query={query} index={0} version="v4" />
			) : (
				<QueryAggregation source={source} />
			)}

			<QueryAddOns query={query} version="v3" isListViewPanel={false} />
		</div>
	);
}

function QueryBuilderV2(props: QueryBuilderV2Props): JSX.Element {
	const { source, query } = props;

	return (
		<QueryBuilderV2Provider>
			<QueryBuilderV2Main source={source} query={query} />
		</QueryBuilderV2Provider>
	);
}

export default QueryBuilderV2;
