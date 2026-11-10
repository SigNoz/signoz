import { useEffect } from 'react';
import * as Sentry from '@sentry/react';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { DataSource } from 'types/common/queryBuilder';

import Hosts from './Hosts';

function InfraMonitoringHosts(): JSX.Element {
	const {
		updateAllQueriesOperators,
		handleSetConfig,
		setSupersetQuery,
		setLastUsedQuery,
		currentQuery,
		resetQuery,
	} = useQueryBuilder();

	useEffect(() => {
		const newQuery = updateAllQueriesOperators(
			initialQueriesMap.metrics,
			PANEL_TYPES.TIME_SERIES,
			DataSource.METRICS,
		);

		setSupersetQuery(newQuery);
		setLastUsedQuery(0);
		handleSetConfig(PANEL_TYPES.TIME_SERIES, DataSource.METRICS);

		return (): void => {
			setLastUsedQuery(0);
		};
	}, [
		updateAllQueriesOperators,
		setSupersetQuery,
		setLastUsedQuery,
		handleSetConfig,
	]);

	useEffect(() => {
		const updatedCurrentQuery = {
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: [
					{
						...currentQuery.builder.queryData[0],
						filters: {
							items: [],
							op: 'AND',
						},
					},
				],
			},
		};

		resetQuery(updatedCurrentQuery);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<Hosts />
		</Sentry.ErrorBoundary>
	);
}

export default InfraMonitoringHosts;
