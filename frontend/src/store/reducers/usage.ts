import {
	GET_INITIAL_USAGE_DATA_ERROR,
	GET_INITIAL_USAGE_DATA_SUCCESS,
	UPDATE_SELECTED_SERVICE,
	UsageActions,
} from 'types/actions/usage';
import { UsageReducer } from 'types/reducer/usage';

const InitialValue: UsageReducer = {
	error: false,
	errorMessage: '',
	loading: true,
	data: [],
	selectedService: '',
	step: 0,
};

const usage = (state = InitialValue, action: UsageActions): UsageReducer => {
	switch (action.type) {
		case GET_INITIAL_USAGE_DATA_SUCCESS: {
			const { data } = action.payload;

			return {
				...state,
				loading: false,
				data,
			};
		}

		case GET_INITIAL_USAGE_DATA_ERROR: {
			return {
				...state,
				error: true,
				errorMessage: action.payload.errorMessage,
			};
		}

		case UPDATE_SELECTED_SERVICE: {
			return {
				...state,
				selectedService: action.payload.selectedService,
			};
		}

		default:
			return state;
	}
};

export default usage;
