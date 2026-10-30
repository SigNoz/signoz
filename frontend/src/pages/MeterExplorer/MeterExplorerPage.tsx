import { useLocation } from 'react-use';
import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';

import { Explorer, Meter } from './constants';

import './MeterExplorer.styles.scss';

function MeterExplorerPage(): JSX.Element {
	const { pathname } = useLocation();

	const routes: TabRoutes[] = [Meter, Explorer];

	return (
		<RouteTab
			className="meter-explorer-page"
			routes={routes}
			activeKey={pathname}
			defaultActiveKey={ROUTES.METER}
		/>
	);
}

export default MeterExplorerPage;
