import { useMemo } from 'react';
import { useLocation } from 'react-use';
import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { useVolumeControlFeatureGate } from 'hooks/metricsExplorer/useVolumeControlFeatureGate';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { navigate } from 'lib/router/navigation';
import { DataSource } from 'types/common/queryBuilder';

import { Explorer, Summary, Views, VolumeControl } from './constants';

import './MetricsExplorerPage.styles.scss';

function MetricsExplorerPage(): JSX.Element {
	const { pathname } = useLocation();
	const { isVolumeControlEnabled } = useVolumeControlFeatureGate();

	const routes: TabRoutes[] = useMemo(
		() => [
			Summary,
			...(isVolumeControlEnabled ? [VolumeControl] : []),
			Explorer,
			Views,
		],
		[isVolumeControlEnabled],
	);

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
			<RouteTab
				routes={routes}
				activeKey={pathname}
				history={{ push: navigate } as any}
			/>
		</div>
	);
}

export default MetricsExplorerPage;
