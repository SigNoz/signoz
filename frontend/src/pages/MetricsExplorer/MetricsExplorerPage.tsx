import './MetricsExplorerPage.styles.scss';

import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import history from 'lib/history';
import { useMemo } from 'react';
import { useLocation } from 'react-use';
import { DataSource } from 'types/common/queryBuilder';

import { Explorer, Summary, Views } from './constants';

function MetricsExplorerPage(): JSX.Element {
	const { pathname } = useLocation();

	const routes: TabRoutes[] = [Summary, Explorer, Views];

	const { updateAllQueriesOperators } = useQueryBuilder();

	const defaultQuery = useMemo(
		() =>
			updateAllQueriesOperators(
				initialQueriesMap[DataSource.METRICS],
				PANEL_TYPES.LIST,
				DataSource.METRICS,
			),
		[updateAllQueriesOperators],
	);

	useShareBuilderUrl({ defaultValue: defaultQuery });

	return (
		<div className="metrics-explorer-page">
			<RouteTab routes={routes} activeKey={pathname} history={history} />
		</div>
	);
}

export default MetricsExplorerPage;
