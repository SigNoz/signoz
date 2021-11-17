import { AppAction } from './app';
import { DashboardActions } from './dashboard';
import { GlobalTimeAction } from './globalTime';
import { MetricsActions } from './metrics';
import { TraceActions } from './trace';

type AppActions =
	| DashboardActions
	| AppAction
	| GlobalTimeAction
	| MetricsActions
	| TraceActions;

export default AppActions;
