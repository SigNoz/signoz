import {
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
		default:
			return state;
	}
};

export default metrics;
