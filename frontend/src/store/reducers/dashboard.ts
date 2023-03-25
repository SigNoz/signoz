import {
	APPLY_SETTINGS_TO_PANEL,
	CREATE_DEFAULT_WIDGET,
	DashboardActions,
	DELETE_DASHBOARD_SUCCESS,
	// DELETE_QUERY,
	DELETE_WIDGET_SUCCESS,
	FLUSH_DASHBOARD,
	GET_ALL_DASHBOARD_ERROR,
	GET_ALL_DASHBOARD_LOADING_START,
	GET_ALL_DASHBOARD_SUCCESS,
	GET_DASHBOARD_ERROR,
	GET_DASHBOARD_LOADING_START,
	GET_DASHBOARD_SUCCESS,
	IS_ADD_WIDGET,
	QUERY_ERROR,
	QUERY_SUCCESS,
	SAVE_SETTING_TO_PANEL_SUCCESS,
	TOGGLE_EDIT_MODE,
	UPDATE_DASHBOARD,
	UPDATE_DASHBOARD_VARIABLES,
	UPDATE_QUERY,
	UPDATE_TITLE_DESCRIPTION_TAGS_SUCCESS,
} from 'types/actions/dashboard';
import InitialValueTypes from 'types/reducer/dashboards';

const InitialValue: InitialValueTypes = {
	dashboards: [],
	loading: false,
	error: false,
	errorMessage: '',
	isEditMode: false,
	isQueryFired: false,
	isAddWidget: false,
};

const dashboardReducer = (
	state = InitialValue,
	action: DashboardActions,
	// eslint-disable-next-line sonarjs/cognitive-complexity
): InitialValueTypes => {
	switch (action.type) {
		case GET_ALL_DASHBOARD_LOADING_START:
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
			const dashboard = action.payload;
			const { data } = dashboard;
			return {
				...state,
				loading: false,
				dashboards: [
					{
						...dashboard,
						data: {
							...data,
						},
					},
				],
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
						data: {
							...dashboardData,
							tags,
							title,
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

		// NOTE: this action will will be dispatched in the single dashboard only
		case CREATE_DEFAULT_WIDGET: {
			const [selectedDashboard] = state.dashboards;
			const { data } = selectedDashboard;
			const { widgets } = data;
			const defaultWidget = action.payload;
			const { query } = action.payload;

			const isPresent = widgets?.find((e) => e.id === action.payload.id);

			if (isPresent !== undefined) {
				return {
					...state,
				};
			}

			return {
				...state,
				dashboards: [
					{
						...selectedDashboard,
						data: {
							...data,
							widgets: [
								...(widgets || []),
								{
									...defaultWidget,
									query,
									id: action.payload.id,
								},
							],
						},
					},
				],
			};
		}

		case QUERY_ERROR: {
			const { widgetId, errorMessage, errorBoolean = true } = action.payload;
			const [selectedDashboard] = state.dashboards;
			const { data } = selectedDashboard;

			const selectedWidgetIndex = data.widgets?.findIndex(
				(e) => e.id === widgetId,
			);
			const { widgets } = data;

			const preWidget = data.widgets?.slice(0, selectedWidgetIndex);
			const afterWidget = data.widgets?.slice(
				(selectedWidgetIndex || 0) + 1, // this is never undefined
				widgets?.length,
			);
			const selectedWidget =
				(selectedDashboard.data.widgets || [])[selectedWidgetIndex || 0] || {};

			return {
				...state,
				dashboards: [
					{
						...selectedDashboard,
						data: {
							...data,
							widgets: [
								...(preWidget || []),
								{
									...selectedWidget,
									queryData: {
										...selectedWidget.queryData,
										error: errorBoolean,
										errorMessage,
									},
								},
								...(afterWidget || []),
							],
						},
					},
				],
				isQueryFired: true,
			};
		}

		case QUERY_SUCCESS: {
			const { widgetId, data: queryDataResponse } = action.payload;

			const { dashboards } = state;
			const [selectedDashboard] = dashboards;
			const { data } = selectedDashboard;
			const { widgets = [] } = data;

			const selectedWidgetIndex = widgets.findIndex((e) => e.id === widgetId) || 0;

			const preWidget = widgets?.slice(0, selectedWidgetIndex) || [];
			const afterWidget =
				widgets.slice(
					selectedWidgetIndex + 1, // this is never undefined
					widgets.length,
				) || [];
			const selectedWidget = widgets[selectedWidgetIndex];

			return {
				...state,
				dashboards: [
					{
						...selectedDashboard,
						data: {
							...data,
							widgets: [
								...preWidget,
								{
									...selectedWidget,
									queryData: {
										data: queryDataResponse,
										error: selectedWidget.queryData.error,
										errorMessage: selectedWidget.queryData.errorMessage,
										loading: false,
									},
								},
								...afterWidget,
							],
						},
					},
				],
				isQueryFired: true,
			};
		}

		case APPLY_SETTINGS_TO_PANEL: {
			const { widgetId } = action.payload;

			const { dashboards } = state;
			const [selectedDashboard] = dashboards;
			const { data } = selectedDashboard;
			const { widgets } = data;

			const selectedWidgetIndex = data.widgets?.findIndex(
				(e) => e.id === widgetId,
			);

			const preWidget = data.widgets?.slice(0, selectedWidgetIndex) || [];
			const afterWidget =
				data.widgets?.slice(
					(selectedWidgetIndex || 0) + 1, // this is never undefined
					widgets?.length,
				) || [];

			const selectedWidget = (selectedDashboard.data.widgets || [])[
				selectedWidgetIndex || 0
			];

			return {
				...state,
				dashboards: [
					{
						...selectedDashboard,
						data: {
							...data,
							widgets: [
								...preWidget,
								{
									...selectedWidget,
									description: action.payload.description,
									id: action.payload.widgetId,
									isStacked: action.payload.isStacked,
									nullZeroValues: action.payload.nullZeroValues,
									opacity: action.payload.opacity,
									timePreferance: action.payload.timePreferance,
									title: action.payload.title,
								},
								...afterWidget,
							],
						},
					},
				],
			};
		}

		case SAVE_SETTING_TO_PANEL_SUCCESS:
		case UPDATE_DASHBOARD: {
			const selectedDashboard = action.payload;

			return {
				...state,
				dashboards: [
					{
						...selectedDashboard,
					},
				],
			};
		}

		case FLUSH_DASHBOARD: {
			return {
				...state,
				dashboards: [],
			};
		}
		case DELETE_WIDGET_SUCCESS: {
			const { widgetId, layout } = action.payload;

			const { dashboards } = state;
			const [selectedDashboard] = dashboards;
			const { data } = selectedDashboard;
			const { widgets = [] } = data;

			return {
				...state,
				dashboards: [
					{
						...selectedDashboard,
						data: {
							...data,
							widgets: widgets.filter((e) => e.id !== widgetId),
							layout,
						},
					},
				],
			};
		}

		case IS_ADD_WIDGET: {
			return {
				...state,
				isAddWidget: action.payload.isAddWidget,
			};
		}

		case UPDATE_QUERY: {
			const { query, widgetId, yAxisUnit } = action.payload;
			const { dashboards } = state;
			const [selectedDashboard] = dashboards;
			const { data } = selectedDashboard;
			const { widgets = [] } = data;

			const selectedWidgetIndex = widgets.findIndex((e) => e.id === widgetId) || 0;

			const preWidget = widgets?.slice(0, selectedWidgetIndex) || [];
			const afterWidget =
				widgets?.slice(
					selectedWidgetIndex + 1, // this is never undefined
					widgets.length,
				) || [];

			const selectedWidget = widgets[selectedWidgetIndex];

			return {
				...state,
				dashboards: [
					{
						...selectedDashboard,
						data: {
							...data,
							widgets: [
								...preWidget,
								{
									...selectedWidget,
									query,
									yAxisUnit,
								},
								...afterWidget,
							],
						},
					},
				],
			};
		}
		case UPDATE_DASHBOARD_VARIABLES: {
			const variablesData = action.payload;
			const { dashboards } = state;
			const [selectedDashboard] = dashboards;
			const { data } = selectedDashboard;

			return {
				...state,
				dashboards: [
					{
						...selectedDashboard,
						data: {
							...data,
							variables: variablesData,
						},
					},
				],
			};
		}
		default:
			return state;
	}
};

export default dashboardReducer;
