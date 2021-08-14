import { combineReducers } from 'redux';
import {
	traceResponseNew,
	spansWSameTraceIDResponse,
	usageDataItem,
	GlobalTime,
	serviceMapStore,
	TraceFilters,
} from '../actions';
import { updateGlobalTimeReducer } from './global';
import { MetricsInitialState, metricsReducer } from './metrics';
import TraceFilterReducer from './traceFilters';
import { traceItemReducer, tracesReducer } from './traces';
import { usageDataReducer } from './usage';
import { ServiceMapReducer } from './serviceMap';

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
