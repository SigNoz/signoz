import { useLocation } from 'react-use';
import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import { useSavedViewEnabled } from 'hooks/useSavedViewEnabled';
import history from 'lib/history';

import { Explorer, Meter, Views } from './constants';

import './MeterExplorer.styles.scss';

function MeterExplorerPage(): JSX.Element {
	const { pathname } = useLocation();
	const isSavedViewEnabled = useSavedViewEnabled();

	const routes: TabRoutes[] = [
		Meter,
		Explorer,
		...(isSavedViewEnabled ? [] : [Views]),
	];

	return (
		<RouteTab
			className="meter-explorer-page"
			routes={routes}
			activeKey={pathname}
			history={history}
			defaultActiveKey={ROUTES.METER}
		/>
	);
}

export default MeterExplorerPage;
