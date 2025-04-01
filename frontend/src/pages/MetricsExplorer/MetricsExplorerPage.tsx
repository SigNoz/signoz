import './MetricsExplorerPage.styles.scss';

import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import { initialQueriesMap } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import history from 'lib/history';
import { useLayoutEffect, useMemo } from 'react';
import { useLocation } from 'react-use';
import { DataSource } from 'types/common/queryBuilder';

import { Explorer, Summary } from './constants';

function MetricsExplorerPage(): JSX.Element {
	const { pathname } = useLocation();

	const routes: TabRoutes[] = [Summary, Explorer];

	const initialQuery = useMemo(() => initialQueriesMap[DataSource.METRICS], []);
	const { resetQuery } = useQueryBuilder();

	useLayoutEffect(() => {
		resetQuery(initialQuery);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div className="metrics-explorer-page">
			<RouteTab routes={routes} activeKey={pathname} history={history} />
		</div>
	);
}

export default MetricsExplorerPage;
