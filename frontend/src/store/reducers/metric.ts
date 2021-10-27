import {
	GET_INITIAL_APPLICATION_ERROR,
	GET_INITIAL_APPLICATION_LOADING,
	GET_INTIAL_APPLICATION_DATA,
	GET_SERVICE_LIST_ERROR,
	GET_SERVICE_LIST_LOADING_START,
	GET_SERVICE_LIST_SUCCESS,
	MetricsActions,
} from 'types/actions/metrics';
import InitialValueTypes from 'types/reducer/metrics';

const InitialValue: InitialValueTypes = {
	error: false,
	errorMessage: '',
	loading: false,
	services: [],
	dbOverView: [],
	externalService: [],
	topEndPoints: [],
	externalAverageDuration: [],
	externalError: [],
	serviceOverview: [],
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
				errorMessage: errorMessage,
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
				loading: true,
			};
		}
		case GET_INITIAL_APPLICATION_ERROR: {
			return {
				...state,
				loading: false,
				errorMessage: action.payload.errorMessage,
				error: true,
			};
		}

		case GET_INTIAL_APPLICATION_DATA: {
			const {
				// dbOverView,
				topEndPoints,
				serviceOverview,
				// externalService,
				// externalAverageDuration,
				// externalError,
			} = action.payload;

			return {
				...state,
				loading: false,
				// dbOverView,
				topEndPoints,
				serviceOverview,
				// externalService,
				// externalAverageDuration,
				// externalError,
			};
		}
		default:
			return state;
	}
};

export default metrics;
