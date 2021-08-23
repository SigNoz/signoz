import { combineReducers } from 'redux';
import {
	GlobalTime,
	serviceMapStore,
	spansWSameTraceIDResponse,
	TraceFilters,
	traceResponseNew,
	usageDataItem,
} from 'store/actions';

import { updateGlobalTimeReducer } from './global';
import { MetricsInitialState, metricsReducer } from './metrics';
import { ServiceMapReducer } from './serviceMap';
import TraceFilterReducer from './traceFilters';
import { traceItemReducer, tracesReducer } from './traces';
import { usageDataReducer } from './usage';

export interface StoreState {
	metricsData: MetricsInitialState;
	traceFilters: TraceFilters;
	traces: traceResponseNew;
	traceItem: spansWSameTraceIDResponse;
	usageDate: usageDataItem[];
	globalTime: GlobalTime;
	serviceMap: serviceMapStore;
}

const reducers = combineReducers<StoreState>({
	traceFilters: TraceFilterReducer,
	traces: tracesReducer,
	traceItem: traceItemReducer,
	usageDate: usageDataReducer,
	globalTime: updateGlobalTimeReducer,
	metricsData: metricsReducer,
	serviceMap: ServiceMapReducer,
});

export default reducers;
