import { AppAction } from './app';
import { GlobalTimeAction } from './globalTime';
import { LogsActions } from './logs';
import { MetricsActions } from './metrics';
import { TraceActions } from './trace';

type AppActions =
	| AppAction
	| GlobalTimeAction
	| MetricsActions
	| TraceActions
	| LogsActions;

export default AppActions;
