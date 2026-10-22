import { useLocation } from 'react-use';
import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import { useSavedViewEnabled } from 'hooks/useSavedViewEnabled';
import history from 'lib/history';

import { logSaveView, logsExplorer, logsPipelines } from './constants';

import './LogsModulePage.styles.scss';

export default function LogsModulePage(): JSX.Element {
	const { pathname } = useLocation();
	const isSavedViewEnabled = useSavedViewEnabled();

	const routes: TabRoutes[] = [
		logsExplorer,
		logsPipelines,
		...(isSavedViewEnabled ? [] : [logSaveView]),
	];

	return (
		<RouteTab
			className="logs-module-container"
			routes={routes}
			activeKey={pathname}
			history={history}
		/>
	);
}
