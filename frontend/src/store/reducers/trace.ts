import {
	GET_TRACE_INITIAL_DATA_ERROR,
	GET_TRACE_INITIAL_DATA_SUCCESS,
	GET_TRACE_LOADING_END,
	GET_TRACE_LOADING_START,
	TraceActions,
	UPDATE_SELECTED_AGG_OPTION,
	UPDATE_SELECTED_ENTITY,
	UPDATE_SELECTED_TRACE_DATA,
	UPDATE_SPANS_LOADING,
	UPDATE_TRACE_SELECTED_KIND,
	UPDATE_TRACE_SELECTED_LATENCY_VALUE,
	UPDATE_TRACE_SELECTED_OPERATION,
	UPDATE_TRACE_SELECTED_SERVICE,
	UPDATE_TRACE_SELECTED_TAGS,
	RESET_TRACE_DATA,
	UPDATE_AGGREGATES,
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
	selectedAggOption: 'count',
	selectedEntity: 'calls',
	spansAggregate: [],
	spansLoading: false,
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
				spansLoading: true,
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
				spansAggregate,
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
				spansAggregate,
				spansLoading: false,
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
				spanList: action.payload.spansList,
				spansAggregate: action.payload.spansAggregate,
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
				spansAggregate,
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
				spansAggregate,
			};
		}

		case GET_TRACE_LOADING_END: {
			return {
				...state,
				loading: false,
			};
		}

		case UPDATE_SELECTED_AGG_OPTION: {
			return {
				...state,
				selectedAggOption: action.payload.selectedAggOption,
			};
		}

		case UPDATE_SELECTED_ENTITY: {
			return {
				...state,
				selectedEntity: action.payload.selectedEntity,
			};
		}

		case UPDATE_SPANS_LOADING: {
			return {
				...state,
				spansLoading: action.payload.loading,
			};
		}

		case RESET_TRACE_DATA: {
			return {
				...intitalState,
			};
		}

		case UPDATE_AGGREGATES: {
			return {
				...state,
				spansAggregate: action.payload.spansAggregate,
				selectedAggOption: action.payload.selectedAggOption,
				selectedEntity: action.payload.selectedEntity,
			};
		}

		default:
			return state;
	}
};
