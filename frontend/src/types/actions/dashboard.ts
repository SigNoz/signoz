import { Layout } from 'react-grid-layout';
import { ApplySettingsToPanelProps } from 'store/actions/dashboard/applySettingsToPanel';
import { Dashboard, Query, Widgets } from 'types/api/dashboard/getAll';
import { QueryData } from 'types/api/widgets/getQuery';

export const GET_DASHBOARD = 'GET_DASHBOARD';
export const UPDATE_DASHBOARD = 'UPDATE_DASHBOARD';

export const GET_ALL_DASHBOARD_LOADING_START =
	'GET_ALL_DASHBOARD_LOADING_START';
export const GET_ALL_DASHBOARD_SUCCESS = 'GET_ALL_DASHBOARD_SUCCESS';
export const GET_ALL_DASHBOARD_ERROR = 'GET_ALL_DASHBOARD_ERROR';

export const GET_DASHBOARD_LOADING_START = 'GET_DASHBOARD_LOADING_START';
export const GET_DASHBOARD_SUCCESS = 'GET_DASHBOARD_SUCCESS';
export const GET_DASHBOARD_ERROR = 'GET_DASHBOARD_ERROR';
export const UPDATE_TITLE_DESCRIPTION_TAGS_SUCCESS =
	'UPDATE_TITLE_DESCRIPTION_TAGS_SUCCESS';
export const UPDATE_TITLE_DESCRIPTION_TAGS_ERROR =
	'UPDATE_TITLE_DESCRIPTION_TAGS_ERROR';
export const TOGGLE_EDIT_MODE = 'TOGGLE_EDIT_MODE';

export const DELETE_DASHBOARD_SUCCESS = 'DELETE_DASHBOARD_SUCCESS';
export const DELETE_DASHBOARD_ERROR = 'DELETE_DASHBOARD_ERROR';

export const CREATE_DEFAULT_WIDGET = 'CREATE_DEFAULT_WIDGET';

export const CREATE_NEW_QUERY = 'CREATE_NEW_QUERY';
export const QUERY_SUCCESS = 'QUERY_SUCCESS';
export const QUERY_ERROR = 'QUERY_ERROR';

export const UPDATE_QUERY = 'UPDATE_QUERY';

export const APPLY_SETTINGS_TO_PANEL = 'APPLY_SETTINGS_TO_PANEL';

export const SAVE_SETTING_TO_PANEL_SUCCESS = 'SAVE_SETTING_TO_PANEL_SUCCESS';
export const SAVE_SETTING_TO_PANEL_ERROR = 'SAVE_SETTING_TO_PANEL_ERROR';

export const DELETE_WIDGET_SUCCESS = 'DELETE_WIDGET_SUCCESS';
export const DELETE_WIDGET_ERROR = 'DELETE_WIDGET_ERROR';

export const IS_ADD_WIDGET = 'IS_ADD_WIDGET';

export const DELETE_QUERY = 'DELETE_QUERY';

interface GetDashboard {
	type: typeof GET_DASHBOARD;
	payload: Dashboard;
}
interface UpdateDashboard {
	type: typeof UPDATE_DASHBOARD;
	payload: Dashboard;
}

interface DeleteDashboardSuccess {
	type: typeof DELETE_DASHBOARD_SUCCESS;
	payload: {
		uuid: Dashboard['uuid'];
	};
}

interface DashboardStart {
	type:
		| typeof GET_ALL_DASHBOARD_LOADING_START
		| typeof GET_DASHBOARD_LOADING_START;
}

interface GetAllDashboardSuccess {
	type: typeof GET_ALL_DASHBOARD_SUCCESS;
	payload: Dashboard[];
}

interface GetDashboardSuccess {
	type: typeof GET_DASHBOARD_SUCCESS;
	payload: Dashboard;
}

interface ApplySettingsToPanel {
	type: typeof APPLY_SETTINGS_TO_PANEL;
	payload: ApplySettingsToPanelProps;
}

interface CreateDefaultWidget {
	type: typeof CREATE_DEFAULT_WIDGET;
	payload: Widgets;
}

interface CreateNewQuery {
	type: typeof CREATE_NEW_QUERY;
	payload: {
		widgetId: string;
	};
}

interface IsAddWidget {
	type: typeof IS_ADD_WIDGET;
	payload: {
		isAddWidget: boolean;
	};
}

interface DashboardError {
	type:
		| typeof GET_ALL_DASHBOARD_ERROR
		| typeof GET_DASHBOARD_ERROR
		| typeof UPDATE_TITLE_DESCRIPTION_TAGS_ERROR
		| typeof DELETE_DASHBOARD_ERROR
		| typeof SAVE_SETTING_TO_PANEL_ERROR
		| typeof DELETE_WIDGET_ERROR;
	payload: {
		errorMessage: string;
	};
}

interface UpdateDashboardTitle {
	type: typeof UPDATE_TITLE_DESCRIPTION_TAGS_SUCCESS;
	payload: {
		title: Dashboard['data']['title'];
		description: Dashboard['data']['description'];
		tags: Dashboard['data']['tags'];
	};
}

interface ToggleEditMode {
	type: typeof TOGGLE_EDIT_MODE;
}

export interface QuerySuccessPayload {
	widgetId: string;
	data: { legend: string; queryData: QueryData[]; query: string }[];
}
interface QuerySuccess {
	type: typeof QUERY_SUCCESS;
	payload: QuerySuccessPayload;
}

interface UpdateQuery {
	type: typeof UPDATE_QUERY;
	payload: {
		query: Query[];
		widgetId: string;
		yAxisUnit: string | undefined;
	};
}

interface QueryError {
	type: typeof QUERY_ERROR;
	payload: {
		errorMessage: string;
		widgetId: string;
	};
}

interface SaveDashboardSuccess {
	type: typeof SAVE_SETTING_TO_PANEL_SUCCESS;
	payload: Dashboard;
}

interface WidgetDeleteSuccess {
	type: typeof DELETE_WIDGET_SUCCESS;
	payload: {
		widgetId: Widgets['id'];
		layout: Layout[];
	};
}

export interface DeleteQueryProps {
	widgetId: string;
	currentIndex: number;
}

interface DeleteQuery {
	type: typeof DELETE_QUERY;
	payload: DeleteQueryProps;
}

export type DashboardActions =
	| GetDashboard
	| UpdateDashboard
	| DeleteDashboardSuccess
	| DashboardError
	| GetAllDashboardSuccess
	| DashboardStart
	| GetDashboardSuccess
	| UpdateDashboardTitle
	| ToggleEditMode
	| CreateDefaultWidget
	| CreateNewQuery
	| QuerySuccess
	| QueryError
	| ApplySettingsToPanel
	| SaveDashboardSuccess
	| WidgetDeleteSuccess
	| IsAddWidget
	| UpdateQuery
	| DeleteQuery;
