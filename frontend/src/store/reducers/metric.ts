import {
	GET_INITIAL_APPLICATION_ERROR,
	GET_INITIAL_APPLICATION_LOADING,
	GET_INITIAL_APPLICATION_METRICS,
	GET_INITIAL_DATABASE_METRICS,
	GET_INITIAL_EXTERNAL_CALL_METRICS,
	GET_SERVICE_LIST_ERROR,
	GET_SERVICE_LIST_LOADING_START,
	GET_SERVICE_LIST_SUCCESS,
	MetricsActions,
	RESET_INITIAL_APPLICATION_DATA,
} from 'types/actions/metrics';
import InitialValueTypes from 'types/reducer/metrics';

const InitialValue: InitialValueTypes = {
	error: false,
	errorMessage: '',
	loading: true,
	metricsApplicationLoading: true,
	services: [],
	// Application metrics
	topEndPoints: [],
	serviceOverview: [],
	applicationRpsEndpoints: [],
	applicationErrorEndpoints: [],
	// DB overview.
	dbRpsEndpoints: [],
	dbAvgDurationEndpoints: [],
	// External call.
	externalCallEndpoint: [],
	externalErrorEndpoints: [],
	addressedExternalCallRPSResponse: [],
	addressedExternalCallDurationResponse: [],
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
			};
		}

		case GET_INITIAL_APPLICATION_METRICS: {
			const {
				serviceOverview,
				topEndPoints,
				applicationRpsEndpoints,
				applicationErrorEndpoints,
			} = action.payload;

			return {
				...state,
				topEndPoints,
				applicationRpsEndpoints,
				applicationErrorEndpoints,
				serviceOverview,
				metricsApplicationLoading: false,
			};
		}

		case GET_INITIAL_DATABASE_METRICS: {
			const { dbRpsEndpoints, dbAvgDurationEndpoints } = action.payload;

			return {
				...state,
				dbRpsEndpoints,
				dbAvgDurationEndpoints,
				metricsApplicationLoading: false,
			};
		}

		case GET_INITIAL_EXTERNAL_CALL_METRICS: {
			const {
				externalCallEndpoint,
				externalErrorEndpoints,
				addressedExternalCallRPSResponse,
				addressedExternalCallDurationResponse,
			} = action.payload;

			return {
				...state,
				externalCallEndpoint,
				externalErrorEndpoints,
				addressedExternalCallRPSResponse,
				addressedExternalCallDurationResponse,
				metricsApplicationLoading: false,
			};
		}
		default:
			return state;
	}
};

export default metrics;
