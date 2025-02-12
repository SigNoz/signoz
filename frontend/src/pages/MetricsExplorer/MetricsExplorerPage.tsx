import './MetricsExplorerPage.styles.scss';

import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import history from 'lib/history';
import { useLocation } from 'react-use';

import { Explorer, Summary, Views } from './constants';

function MetricsExplorerPage(): JSX.Element {
	const { pathname } = useLocation();

	const routes: TabRoutes[] = [Summary, Explorer, Views];

	return (
		<div className="metrics-explorer-page">
			<RouteTab routes={routes} activeKey={pathname} history={history} />
		</div>
	);
}

export default MetricsExplorerPage;
