import { combineReducers } from 'redux';

import appReducer from './app';
import dashboardReducer from './dashboard';
import globalTimeReducer from './global';
import { LogsReducer } from './logs';
import metricsReducers from './metric';
import { PipelineReducer } from './pipeline';
import { ServiceMapReducer } from './serviceMap';
import traceReducer from './trace';
import { usageDataReducer } from './usage';

const reducers = combineReducers({
	traces: traceReducer,
	usageDate: usageDataReducer,
	globalTime: globalTimeReducer,
	serviceMap: ServiceMapReducer,
	dashboards: dashboardReducer,
	app: appReducer,
	metrics: metricsReducers,
	logs: LogsReducer,
	pipeline: PipelineReducer,
});

export type AppState = ReturnType<typeof reducers>;

export default reducers;
