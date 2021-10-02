import { AppAction } from './app';
import { DashboardActions } from './dashboard';
import { GlobalTimeAction } from './globalTime';

type AppActions = DashboardActions | AppAction | GlobalTimeAction;

export default AppActions;
