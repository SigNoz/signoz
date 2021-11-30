import { AppAction } from './app';
import { DashboardActions } from './dashboard';
import { GlobalTimeAction } from './globalTime';
import { MetricsActions } from './metrics';
import { TraceActions } from './trace';
import { UsageActions } from './usage';

type AppActions =
	| DashboardActions
	| AppAction
	| GlobalTimeAction
	| MetricsActions
	| TraceActions
	| UsageActions;

export default AppActions;
