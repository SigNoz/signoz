import {
	GET_TRACE_INITIAL_DATA_ERROR,
	GET_TRACE_INITIAL_DATA_SUCCESS,
	GET_TRACE_LOADING_START,
	TraceActions,
} from 'types/actions/trace';
import { TraceReducer } from 'types/reducer/trace';

const intitalState: TraceReducer = {
	kind: '',
	latency: {
		max: '',
		min: '',
	},
	operation: '',
	service: '',
	tags: [],
	errorMessage: '',
	loading: false,
	error: false,
	serviceList: [],
};

export const traceReducer = (
	state = intitalState,
	action: TraceActions,
): TraceReducer => {
	switch (action.type) {
		case GET_TRACE_INITIAL_DATA_ERROR: {
			return {
				...state,
				errorMessage: action.payload.errorMessage,
				loading: false,
				error: true,
			};
		}

		case GET_TRACE_LOADING_START: {
			return {
				...state,
				loading: true,
			};
		}

		case GET_TRACE_INITIAL_DATA_SUCCESS: {
			const { serviceList } = action.payload;
			return {
				...state,
				serviceList: serviceList,
				loading: false,
				error: false,
			};
		}

		default:
			return state;
	}
};
