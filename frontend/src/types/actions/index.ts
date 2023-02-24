import { AppAction } from './app';
import { DashboardActions } from './dashboard';
import { GlobalTimeAction } from './globalTime';
import { LogsActions } from './logs';
import { MetricsActions } from './metrics';
import { Pipeline } from './pipeline';
import { TraceActions } from './trace';

type AppActions =
	| DashboardActions
	| AppAction
	| GlobalTimeAction
	| MetricsActions
	| TraceActions
	| LogsActions
	| Pipeline;

export default AppActions;
