import { useLocation } from 'react-use';
import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import history from 'lib/history';

import { Explorer, Meter, Views } from './constants';

import './MeterExplorer.styles.scss';

function MeterExplorerPage(): JSX.Element {
	const { pathname } = useLocation();

	const routes: TabRoutes[] = [Meter, Explorer, Views];

	return (
		<div className="meter-explorer-page">
			<RouteTab
				routes={routes}
				activeKey={pathname}
				history={history}
				defaultActiveKey={ROUTES.METER}
			/>
		</div>
	);
}

export default MeterExplorerPage;
