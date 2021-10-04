import { AppAction } from './app';
import { DashboardActions } from './dashboard';
import { GlobalTimeAction } from './globalTime';
import { MetricsActions } from './metrics';

type AppActions =
	| DashboardActions
	| AppAction
	| GlobalTimeAction
	| MetricsActions;

export default AppActions;
