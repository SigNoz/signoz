import { AppAction } from './app';
import { GlobalTimeAction } from './globalTime';
import { MetricsActions } from './metrics';

type AppActions = AppAction | GlobalTimeAction | MetricsActions;

export default AppActions;
