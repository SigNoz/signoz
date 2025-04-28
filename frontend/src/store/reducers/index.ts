import { combineReducers } from 'redux';

import appReducer from './app';
import globalTimeReducer from './global';
import { LogsReducer } from './logs';
import metricsReducers from './metric';
import { ServiceMapReducer } from './serviceMap';
import traceReducer from './trace';

const reducers = combineReducers({
	traces: traceReducer,
	globalTime: globalTimeReducer,
	serviceMap: ServiceMapReducer,
	app: appReducer,
	metrics: metricsReducers,
	logs: LogsReducer,
});

export type AppState = ReturnType<typeof reducers>;

export default reducers;
