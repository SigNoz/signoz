import {
	GET_TRACE_INITIAL_DATA_ERROR,
	GET_TRACE_INITIAL_DATA_SUCCESS,
	GET_TRACE_LOADING_END,
	GET_TRACE_LOADING_START,
	TraceActions,
	UPDATE_SELECTED_TRACE_DATA,
	UPDATE_TRACE_SELECTED_KIND,
	UPDATE_TRACE_SELECTED_LATENCY_VALUE,
	UPDATE_TRACE_SELECTED_OPERATION,
	UPDATE_TRACE_SELECTED_SERVICE,
	UPDATE_TRACE_SELECTED_TAGS,
} from 'types/actions/trace';
import { TraceReducer } from 'types/reducer/trace';

const intitalState: TraceReducer = {
	error: false,
	errorMessage: '',
	loading: true,
	operationsList: [],
	selectedKind: '',
	selectedLatency: {
		max: '',
		min: '',
	},
	selectedOperation: '',
	selectedService: '',
	selectedTags: [],
	serviceList: [],
	spanList: [],
	tagsSuggestions: [],
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
			const {
				serviceList,
				operationList,
				tagsSuggestions,
				selectedOperation,
				selectedService,
				selectedTags,
				spansList,
				selectedKind,
				selectedLatency,
			} = action.payload;

			return {
				...state,
				serviceList: serviceList,
				tagsSuggestions,
				selectedOperation,
				selectedService,
				selectedTags,
				spanList: spansList,
				operationsList: operationList,
				error: false,
				selectedKind,
				selectedLatency,
			};
		}

		case UPDATE_TRACE_SELECTED_KIND: {
			return {
				...state,
				selectedKind: action.payload.selectedKind,
			};
		}

		case UPDATE_TRACE_SELECTED_LATENCY_VALUE: {
			return {
				...state,
				selectedLatency: action.payload.selectedLatency,
			};
		}

		case UPDATE_TRACE_SELECTED_OPERATION: {
			return {
				...state,
				selectedOperation: action.payload.selectedOperation,
			};
		}

		case UPDATE_TRACE_SELECTED_SERVICE: {
			return {
				...state,
				selectedService: action.payload.selectedService,
			};
		}

		case UPDATE_TRACE_SELECTED_TAGS: {
			return {
				...state,
				selectedTags: action.payload.selectedTags,
			};
		}

		case UPDATE_SELECTED_TRACE_DATA: {
			const {
				spansList,
				tagsSuggestions,
				operationList,
				selectedOperation,
				selectedLatency,
				selectedService,
				selectedKind,
			} = action.payload;

			return {
				...state,
				spanList: spansList,
				tagsSuggestions,
				operationsList: operationList,
				selectedOperation,
				selectedLatency,
				selectedService,
				selectedKind,
			};
		}

		case GET_TRACE_LOADING_END: {
			return {
				...state,
				loading: false,
			};
		}

		default:
			return state;
	}
};
