import {
	GET_TRACE_INITIAL_DATA_ERROR,
	GET_TRACE_INITIAL_DATA_SUCCESS,
	GET_TRACE_LOADING_START,
	GET_TRACE_SELECTED_DATA,
	TraceActions,
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
				loading: false,
				error: false,
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

		case GET_TRACE_SELECTED_DATA: {
			const { tagsSuggestions, operationList, spansList } = action.payload;

			return {
				...state,
				tagsSuggestions,
				operationsList: operationList,
				spanList: spansList,
			};
		}

		default:
			return state;
	}
};
