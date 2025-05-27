import './QueryBuilderV2.styles.scss';

import { OPERATORS, PANEL_TYPES } from 'constants/queryBuilder';
import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import { memo, useMemo } from 'react';
import { DataSource } from 'types/common/queryBuilder';

import { LogsQB } from './Logs/LogsQB';
import MetricsQB from './Metrics/MetricsQB';
import { QueryBuilderV2Provider } from './QueryBuilderV2Context';
import TracesQB from './Traces/TracesQB';

export type QueryBuilderV2Props = {
	source: DataSource;
	panelType: PANEL_TYPES;
	filterConfigs: QueryBuilderProps['filterConfigs'];
	isListViewPanel: boolean;
	version: string;
};

const QueryBuilderV2Main = memo(function QueryBuilderV2Main({
	source,
	panelType,
	filterConfigs,
	isListViewPanel,
	version,
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
			{isMetricsDataSource ? (
				<MetricsQB
					source={DataSource.METRICS}
					filterConfigs={filterConfigs}
					panelType={panelType}
					version={version}
					isListViewPanel={isListViewPanel}
				/>
			) : null}
			{isLogsDataSource ? (
				<LogsQB
					source={DataSource.LOGS}
					filterConfigs={listViewLogFilterConfigs}
					panelType={panelType}
					version={version}
					isListViewPanel={isListViewPanel}
				/>
			) : null}
			{isTracesDataSource ? (
				<TracesQB
					source={DataSource.TRACES}
					filterConfigs={listViewTracesFilterConfigs}
					panelType={panelType}
					version={version}
					isListViewPanel={isListViewPanel}
				/>
			) : null}
		</div>
	);
});

function QueryBuilderV2(props: QueryBuilderV2Props): JSX.Element {
	const { source, panelType, filterConfigs, isListViewPanel, version } = props;

	return (
		<QueryBuilderV2Provider>
			<QueryBuilderV2Main
				source={source}
				panelType={panelType}
				filterConfigs={filterConfigs}
				isListViewPanel={isListViewPanel}
				version={version}
			/>
		</QueryBuilderV2Provider>
	);
}

export default QueryBuilderV2;
