import { combineReducers } from 'redux';

import appReducer from './app';
import dashboardReducer from './dashboard';
import globalTimeReducer from './global';
import metricsReducers from './metric';
import { ServiceMapReducer } from './serviceMap';
import traceReducer from './trace';
import TraceFilterReducer from './traceFilters';
import { traceItemReducer } from './traces';
import { usageDataReducer } from './usage';

const reducers = combineReducers({
	traceFilters: TraceFilterReducer,
	traces: traceReducer,
	traceItem: traceItemReducer,
	usageDate: usageDataReducer,
	globalTime: globalTimeReducer,
	serviceMap: ServiceMapReducer,
	dashboards: dashboardReducer,
	app: appReducer,
	metrics: metricsReducers,
});

export type AppState = ReturnType<typeof reducers>;

export default reducers;
