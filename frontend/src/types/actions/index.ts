import { AppAction } from './app';
import { GlobalTimeAction } from './globalTime';
import { MetricsActions } from './metrics';
import { TraceActions } from './trace';

type AppActions = AppAction | GlobalTimeAction | MetricsActions | TraceActions;

export default AppActions;
