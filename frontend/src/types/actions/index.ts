import { AppAction } from './app';
import { GlobalTimeAction } from './globalTime';
import { LogsActions } from './logs';
import { MetricsActions } from './metrics';

type AppActions = AppAction | GlobalTimeAction | MetricsActions | LogsActions;

export default AppActions;
