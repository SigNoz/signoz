import logEvent from 'api/common/logEvent';
import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import { useAppLocation } from 'lib/router/useAppLocation';

import { tracesExplorer, tracesFunnel, tracesSaveView } from './constants';

import './TracesModulePage.styles.scss';

function TracesModulePage(): JSX.Element {
	const { pathname } = useAppLocation();

	const routes: TabRoutes[] = [
		tracesExplorer,
		tracesFunnel(pathname),
		tracesSaveView,
	].filter(Boolean) as TabRoutes[];

	const handleTabChange = (activeRoute: string): void => {
		if (activeRoute === ROUTES.TRACES_FUNNELS) {
			logEvent('Trace Funnels: visited from trace explorer page', {});
		}
	};

	return (
		<div className="traces-module-container">
			<RouteTab
				routes={routes}
				activeKey={
					pathname.includes(ROUTES.TRACES_FUNNELS) ? ROUTES.TRACES_FUNNELS : pathname
				}
				onChangeHandler={handleTabChange}
			/>
		</div>
	);
}

export default TracesModulePage;
