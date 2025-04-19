import './TracesModulePage.styles.scss';

import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import history from 'lib/history';
import { useLocation } from 'react-router-dom';

import { tracesExplorer, tracesFunnel, tracesSaveView } from './constants';

function TracesModulePage(): JSX.Element {
	const { pathname } = useLocation();

	const routes: TabRoutes[] = [
		tracesExplorer,
		process.env.NODE_ENV === 'development' ? tracesFunnel : null,
		tracesSaveView,
	].filter(Boolean) as TabRoutes[];

	return (
		<div className="traces-module-container">
			<RouteTab routes={routes} activeKey={pathname} history={history} />
		</div>
	);
}

export default TracesModulePage;
