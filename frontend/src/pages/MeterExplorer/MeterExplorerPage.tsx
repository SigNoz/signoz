import './MeterExplorer.styles.scss';

import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import history from 'lib/history';
import { useMemo } from 'react';
import { useLocation } from 'react-use';
import { DataSource } from 'types/common/queryBuilder';

import { Explorer, Views } from './constants';

function MeterExplorerPage(): JSX.Element {
	const { pathname } = useLocation();

	const routes: TabRoutes[] = [Explorer, Views];

	const { updateAllQueriesOperators } = useQueryBuilder();

	const defaultQuery = useMemo(
		() =>
			updateAllQueriesOperators(
				initialQueriesMap[DataSource.METER],
				PANEL_TYPES.LIST,
				DataSource.METER,
			),
		[updateAllQueriesOperators],
	);

	useShareBuilderUrl({ defaultValue: defaultQuery });

	return (
		<div className="meter-explorer-page">
			<RouteTab routes={routes} activeKey={pathname} history={history} />
		</div>
	);
}

export default MeterExplorerPage;
