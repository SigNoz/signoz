import logEvent from 'api/common/logEvent';
import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import { useAppLocation } from 'lib/router/useAppLocation';

import { tracesExplorer, tracesFunnel } from './constants';

import './TracesModulePage.styles.scss';

function TracesModulePage(): JSX.Element {
	const { pathname } = useAppLocation();

	const routes: TabRoutes[] = [tracesExplorer, tracesFunnel(pathname)];

	const handleTabChange = (activeRoute: string): void => {
		if (activeRoute === ROUTES.TRACES_FUNNELS) {
			logEvent('Trace Funnels: visited from trace explorer page', {});
		}
	};

	return (
		<RouteTab
			className="traces-module-container"
			routes={routes}
			activeKey={
				pathname.includes(ROUTES.TRACES_FUNNELS) ? ROUTES.TRACES_FUNNELS : pathname
			}
			onChangeHandler={handleTabChange}
		/>
	);
}

export default TracesModulePage;
