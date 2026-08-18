import { useLocation } from 'react-use';
import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import { navigate } from 'lib/router/navigation';

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
				history={{ push: navigate } as any}
				defaultActiveKey={ROUTES.METER}
			/>
		</div>
	);
}

export default MeterExplorerPage;
