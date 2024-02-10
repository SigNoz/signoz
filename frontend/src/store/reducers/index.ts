import { combineReducers } from 'redux';

import appReducer from './app';
import globalTimeReducer from './global';
import { LogsReducer } from './logs';
import metricsReducers from './metric';
import { ServiceMapReducer } from './serviceMap';
import traceReducer from './trace';
import { usageDataReducer } from './usage';

const reducers = combineReducers({
	traces: traceReducer,
	usageDate: usageDataReducer,
	globalTime: globalTimeReducer,
	serviceMap: ServiceMapReducer,
	app: appReducer,
	metrics: metricsReducers,
	logs: LogsReducer,
});

export type AppState = ReturnType<typeof reducers>;

export default reducers;
