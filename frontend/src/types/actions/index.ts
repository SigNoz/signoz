import type { AppAction } from './app';
import type { GlobalTimeAction } from './globalTime';
import type { MetricsActions } from './metrics';

type AppActions = AppAction | GlobalTimeAction | MetricsActions;

export default AppActions;
