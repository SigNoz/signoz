import './TracesModulePage.styles.scss';

import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import { FeatureKeys } from 'constants/features';
import history from 'lib/history';
import { useAppContext } from 'providers/App/App';
import { useLocation } from 'react-router-dom-v5-compat';

import { tracesExplorer, tracesFunnel, tracesSaveView } from './constants';

function TracesModulePage(): JSX.Element {
	const { pathname } = useLocation();
	const { featureFlags } = useAppContext();

	const isTraceFunnelsEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.TRACE_FUNNELS)
			?.active || false;

	const routes: TabRoutes[] = [
		tracesExplorer,
		isTraceFunnelsEnabled ? tracesFunnel : null,
		tracesSaveView,
	].filter(Boolean) as TabRoutes[];

	return (
		<div className="traces-module-container">
			<RouteTab routes={routes} activeKey={pathname} history={history} />
		</div>
	);
}

export default TracesModulePage;
