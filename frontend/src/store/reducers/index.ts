// eslint-disable-next-line no-restricted-imports
import { combineReducers } from 'redux';

import appReducer from './app';
import globalTimeReducer from './global';
import metricsReducers from './metric';
import { ServiceMapReducer } from './serviceMap';
import { usageDataReducer } from './usage';

const reducers = combineReducers({
	usageDate: usageDataReducer,
	globalTime: globalTimeReducer,
	serviceMap: ServiceMapReducer,
	app: appReducer,
	metrics: metricsReducers,
});

export type AppState = ReturnType<typeof reducers>;

export default reducers;
