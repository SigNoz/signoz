import './QueryBuilderV2.styles.scss';

import { OPERATORS } from 'constants/queryBuilder';
import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import { useMemo } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { LogsQB } from './Logs/LogsQB';
import MetricsQB from './Metrics/MetricsQB';
import { QueryBuilderV2Provider } from './QueryBuilderV2Context';
import TracesQB from './Traces/TracesQB';

type QueryBuilderV2Props = {
	source: DataSource;
	query: IBuilderQuery;
};

function QueryBuilderV2Main({
	source,
	query,
}: QueryBuilderV2Props): JSX.Element {
	const isMetricsDataSource = source === DataSource.METRICS;
	const isLogsDataSource = source === DataSource.LOGS;
	const isTracesDataSource = source === DataSource.TRACES;

	const listViewLogFilterConfigs: QueryBuilderProps['filterConfigs'] = useMemo(() => {
		const config: QueryBuilderProps['filterConfigs'] = {
			stepInterval: { isHidden: true, isDisabled: true },
			having: { isHidden: true, isDisabled: true },
			filters: {
				customKey: 'body',
				customOp: OPERATORS.CONTAINS,
			},
		};

		return config;
	}, []);

	const listViewTracesFilterConfigs: QueryBuilderProps['filterConfigs'] = useMemo(() => {
		const config: QueryBuilderProps['filterConfigs'] = {
			stepInterval: { isHidden: true, isDisabled: true },
			having: { isHidden: true, isDisabled: true },
			limit: { isHidden: true, isDisabled: true },
			filters: {
				customKey: 'body',
				customOp: OPERATORS.CONTAINS,
			},
		};

		return config;
	}, []);

	return (
		<div className="query-builder-v2">
			{isMetricsDataSource ? <MetricsQB query={query} /> : null}
			{isLogsDataSource ? (
				<LogsQB
					query={query}
					filterConfigs={
						query.dataSource === DataSource.TRACES
							? listViewTracesFilterConfigs
							: listViewLogFilterConfigs
					}
				/>
			) : null}
			{isTracesDataSource ? <TracesQB query={query} /> : null}
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
