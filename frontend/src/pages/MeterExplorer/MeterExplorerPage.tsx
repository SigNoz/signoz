import './MeterExplorer.styles.scss';

import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import history from 'lib/history';
import { useLocation } from 'react-use';

import { Explorer, Views } from './constants';

function MeterExplorerPage(): JSX.Element {
	const { pathname } = useLocation();

	const routes: TabRoutes[] = [Explorer, Views];

	return (
		<div className="meter-explorer-page">
			<RouteTab routes={routes} activeKey={pathname} history={history} />
		</div>
	);
}

export default MeterExplorerPage;
