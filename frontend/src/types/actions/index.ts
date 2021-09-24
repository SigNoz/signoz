import { AppAction } from './app';
import { DashboardActions } from './dashboard';

type AppActions = DashboardActions | AppAction;

export default AppActions;
