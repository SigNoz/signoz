import { combineReducers } from 'redux';

import dashboardReducer from './dashboard';
import { updateGlobalTimeReducer } from './global';
import { metricsReducer } from './metrics';
import { ServiceMapReducer } from './serviceMap';
import TraceFilterReducer from './traceFilters';
import { traceItemReducer, tracesReducer } from './traces';
import { usageDataReducer } from './usage';

const reducers = combineReducers({
	traceFilters: TraceFilterReducer,
	traces: tracesReducer,
	traceItem: traceItemReducer,
	usageDate: usageDataReducer,
	globalTime: updateGlobalTimeReducer,
	metricsData: metricsReducer,
	serviceMap: ServiceMapReducer,
	dashboards: dashboardReducer,
});

export type AppState = ReturnType<typeof reducers>;

export default reducers;
