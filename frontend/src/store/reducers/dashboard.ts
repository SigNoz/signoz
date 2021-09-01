import {
	DashboardActions,
	GET_ALL_DASHBOARD_ERROR,
	GET_ALL_DASHBOARD_LOADING_START,
	GET_ALL_DASHBOARD_SUCCESS,
} from 'types/actions/dashboard';
import InitialValueTypes from 'types/reducer/dashboards';

const InitialValue: InitialValueTypes = {
	dashboards: [],
	loading: false,
	error: false,
	errorMessage: '',
};

const dashboard = (
	state = InitialValue,
	action: DashboardActions,
): InitialValueTypes => {
	switch (action.type) {
		case GET_ALL_DASHBOARD_LOADING_START: {
			return {
				...state,
				loading: true,
			};
		}

		case GET_ALL_DASHBOARD_SUCCESS: {
			return {
				...state,
				loading: false,
				dashboards: action.payload,
			};
		}

		case GET_ALL_DASHBOARD_ERROR: {
			const { payload } = action;

			return {
				...state,
				loading: false,
				error: true,
				errorMessage: payload.errorMessage,
			};
		}
		default:
			return state;
	}
};

export default dashboard;
