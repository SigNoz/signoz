import {
	GET_INITIAL_APPLICATION_ERROR,
	GET_INITIAL_APPLICATION_LOADING,
	GET_INTIAL_APPLICATION_DATA,
	GET_SERVICE_LIST_ERROR,
	GET_SERVICE_LIST_LOADING_START,
	GET_SERVICE_LIST_SUCCESS,
	MetricsActions,
	RESET_INITIAL_APPLICATION_DATA,
} from 'types/actions/metrics';
import InitialValueTypes from 'types/reducer/metrics';

export const InitialValue: InitialValueTypes = {
	error: false,
	errorMessage: '',
	loading: true,
	metricsApplicationLoading: true,
	services: [],
	dbOverView: [],
	externalService: [],
	topOperations: [],
	externalAverageDuration: [],
	externalError: [],
	serviceOverview: [],
	topLevelOperations: [],
};

const metrics = (
	state = InitialValue,
	action: MetricsActions,
): InitialValueTypes => {
	switch (action.type) {
		case GET_SERVICE_LIST_ERROR: {
			const { errorMessage } = action.payload;

			return {
				...state,
				error: true,
				errorMessage,
				loading: false,
			};
		}

		case GET_SERVICE_LIST_LOADING_START: {
			return {
				...state,
				loading: true,
			};
		}

		case GET_SERVICE_LIST_SUCCESS: {
			return {
				...state,
				loading: false,
				services: action.payload,
			};
		}

		case GET_INITIAL_APPLICATION_LOADING: {
			return {
				...state,
				metricsApplicationLoading: true,
			};
		}
		case GET_INITIAL_APPLICATION_ERROR: {
			return {
				...state,
				metricsApplicationLoading: false,
				errorMessage: action.payload.errorMessage,
				error: true,
			};
		}

		case RESET_INITIAL_APPLICATION_DATA: {
			return {
				...InitialValue,
				// ...state.resourceAttributeQueries,
				// resourceAttributeQueries: state.resourceAttributeQueries,
			};
		}

		case GET_INTIAL_APPLICATION_DATA: {
			const {
				// dbOverView,
				topOperations,
				serviceOverview,
				// externalService,
				// externalAverageDuration,
				// externalError,
				topLevelOperations,
			} = action.payload;

			return {
				...state,
				// dbOverView,
				topOperations,
				serviceOverview,
				// externalService,
				// externalAverageDuration,
				// externalError,
				metricsApplicationLoading: false,
				topLevelOperations,
			};
		}

		default:
			return state;
	}
};

export default metrics;
