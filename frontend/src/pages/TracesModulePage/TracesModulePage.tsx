import logEvent from 'api/common/logEvent';
import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import { useSavedViewEnabled } from 'hooks/useSavedViewEnabled';
import { useAppLocation } from 'lib/router/useAppLocation';
import { navigate } from 'lib/router/navigation';

import { tracesExplorer, tracesFunnel, tracesSaveView } from './constants';

import './TracesModulePage.styles.scss';

function TracesModulePage(): JSX.Element {
	const { pathname } = useAppLocation();
	const isSavedViewEnabled = useSavedViewEnabled();

	const routes: TabRoutes[] = [
		tracesExplorer,
		tracesFunnel(pathname),
		...(isSavedViewEnabled ? [] : [tracesSaveView]),
	].filter(Boolean) as TabRoutes[];

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
			history={{ push: navigate } as any}
			onChangeHandler={handleTabChange}
		/>
	);
}

export default TracesModulePage;
