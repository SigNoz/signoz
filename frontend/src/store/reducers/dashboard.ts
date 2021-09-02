import {
	DashboardActions,
	DELETE_DASHBOARD_SUCCESS,
	GET_ALL_DASHBOARD_ERROR,
	GET_ALL_DASHBOARD_LOADING_START,
	GET_ALL_DASHBOARD_SUCCESS,
	GET_DASHBOARD_ERROR,
	GET_DASHBOARD_LOADING_START,
	GET_DASHBOARD_SUCCESS,
	TOGGLE_EDIT_MODE,
	UPDATE_TITLE_DESCRIPTION_TAGS_SUCCESS,
} from 'types/actions/dashboard';
import InitialValueTypes from 'types/reducer/dashboards';

const InitialValue: InitialValueTypes = {
	dashboards: [],
	loading: false,
	error: false,
	errorMessage: '',
	isEditMode: false,
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

		case GET_DASHBOARD_LOADING_START: {
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

		case GET_DASHBOARD_SUCCESS: {
			return {
				...state,
				loading: false,
				dashboards: [{ ...action.payload }],
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

		case GET_DASHBOARD_ERROR: {
			return {
				...state,
				loading: false,
				errorMessage: action.payload.errorMessage,
				error: true,
			};
		}

		case UPDATE_TITLE_DESCRIPTION_TAGS_SUCCESS: {
			const [dashboard] = state.dashboards;

			const dashboardData = dashboard.data;
			const { tags, title, description } = action.payload;

			return {
				...state,
				dashboards: [
					{
						created_at: dashboard.created_at,
						id: dashboard.id,
						updated_at: dashboard.updated_at,
						uuid: dashboard.uuid,
						title,
						data: {
							...dashboardData,
							tags,
							description,
						},
					},
				],
			};
		}

		case TOGGLE_EDIT_MODE: {
			return {
				...state,
				isEditMode: !state.isEditMode,
			};
		}

		case DELETE_DASHBOARD_SUCCESS: {
			return {
				...state,
				dashboards: state.dashboards.filter((e) => e.uuid !== action.payload.uuid),
			};
		}
		default:
			return state;
	}
};

export default dashboard;
