import { ActionTypes } from './types';
import api, { apiV1 } from '../../api';

import { Dispatch } from 'redux';
import { GlobalTime } from './global';
import { toUTCEpoch } from '../../utils/timeUtils';
import ROUTES from 'Src/constants/routes';

// PNOTE
// define trace interface - what it should return
// define action creator to show list of traces on component mount -- use useEffect ( , []) -> Mounts when loaded first time
// Date() - takes number of milliseconds as input, our API takes in microseconds
// Sample API call for traces - https://api.signoz.io/api/traces?end=1606968273667000&limit=20&lookback=2d&maxDuration=&minDuration=&service=driver&operation=&start=1606968100867000

export interface Tree {
	name: string;
	value: number;
	children?: Tree[];
}

export interface RefItem {
	refType: string;
	traceID: string;
	spanID: string;
}

export interface TraceTagItem {
	key: string;
	// type: string;
	value: string;
}

export interface ProcessItem {
	serviceName: string;
	tags: TraceTagItem[];
}

// PNOTE - Temp DS for converting span to tree which can be consumed by flamegraph
export interface pushDStree {
	id: string;
	name: string;
	value: number;
	time: number;
	startTime: number;
	tags: TraceTagItem[];
	children: pushDStree[];
}

export interface spanItem {
	traceID: string; // index 0
	spanID: string; // index 1
	operationName: string; // index 2
	startTime: number; // index 3
	duration: number; // index 4
	references: RefItem[]; // index 5
	tags: []; //index 6
	logs: []; // index 7
	processID: string; // index 8
	warnings: []; // index 9
	children: pushDStree[]; // index 10 // PNOTE - added this as we are adding extra field in span item to convert trace to tree.
	// Should this field be optional?
}

//let mapped_array :{ [id: string] : spanItem; } = {};

export interface traceItem {
	traceID: string;
	spans: spanItem[];
	processes: { [id: string]: ProcessItem };
	warnings: [];
}

export interface traceResponse {
	data: traceItem[];
	total: number;
	limit: number;
	offset: number;
	error: [];
}

export type span = [
	number,
	string,
	string,
	string,
	string,
	string,
	string,
	string | string[],
	string | string[],
	string | string[],
	pushDStree[],
];

export interface spanList {
	events: span[];
	segmentID: string;
	columns: string[];
}

// export interface traceResponseNew{
//   [id: string] : spanList;
// }
export interface traceResponseNew {
	[id: string]: spanList;
}

export interface spansWSameTraceIDResponse {
	[id: string]: spanList;
}

export interface FetchTracesAction {
	type: ActionTypes.fetchTraces;
	payload: traceResponseNew;
}

export interface FetchTraceItemAction {
	type: ActionTypes.fetchTraceItem;
	payload: spansWSameTraceIDResponse;
}

export const fetchTraces = (globalTime: GlobalTime, filter_params: string) => {
	return async (dispatch: Dispatch) => {
		if (globalTime) {
			const request_string =
				'/spans?limit=100&lookback=2d&start=' +
				toUTCEpoch(globalTime.minTime) +
				'&end=' +
				toUTCEpoch(globalTime.maxTime) +
				'&' +
				filter_params;
			const response = await api.get<traceResponseNew>(apiV1 + request_string);

			dispatch<FetchTracesAction>({
				type: ActionTypes.fetchTraces,
				payload: response.data,
				//PNOTE - response.data in the axios response has the actual API response?
			});
		}
	};
};

export const fetchTraceItem = (traceID: string) => {
	return async (dispatch: Dispatch) => {
		const request_string = ROUTES.TRACES + '/' + traceID;
		const response = await api.get<spansWSameTraceIDResponse>(
			apiV1 + request_string,
		);

		dispatch<FetchTraceItemAction>({
			type: ActionTypes.fetchTraceItem,
			payload: response.data,
			//PNOTE - response.data in the axios response has the actual API response?
		});
	};
};
