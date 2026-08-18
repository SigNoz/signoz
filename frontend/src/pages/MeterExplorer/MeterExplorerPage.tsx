import { useLocation } from 'react-use';
import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import { useSavedViewEnabled } from 'hooks/useSavedViewEnabled';
import { navigate } from 'lib/router/navigation';

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
			history={{ push: navigate } as any}
			defaultActiveKey={ROUTES.METER}
		/>
	);
}

export default MeterExplorerPage;
