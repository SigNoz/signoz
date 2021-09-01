import { Dashboard } from 'types/api/dashboard/getAll';

export const GET_DASHBOARD = 'GET_DASHBOARD';
export const UPDATE_DASHBOARD = 'UPDATE_DASHBOARD';
export const DELETE_DASHBOARD = 'DELETE_DASHBOARD';

export const GET_ALL_DASHBOARD_LOADING_START =
	'GET_ALL_DASHBOARD_LOADING_START';
export const GET_ALL_DASHBOARD_SUCCESS = 'GET_ALL_DASHBOARD_SUCCESS';
export const GET_ALL_DASHBOARD_ERROR = 'GET_ALL_DASHBOARD_ERROR';

export const GET_DASHBOARD_LOADING_START = 'GET_DASHBOARD_LOADING_START';
export const GET_DASHBOARD_SUCCESS = 'GET_DASHBOARD_SUCCESS';
export const GET_DASHBOARD_ERROR = 'GET_DASHBOARD_ERROR';

interface GetDashboard {
	type: typeof GET_DASHBOARD;
	payload: Dashboard;
}
interface UpdateDashboard {
	type: typeof UPDATE_DASHBOARD;
	payload: Dashboard;
}

interface DeleteDashboard {
	type: typeof DELETE_DASHBOARD;
	payload: Dashboard;
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

interface DashboardError {
	type: typeof GET_ALL_DASHBOARD_ERROR | typeof GET_DASHBOARD_ERROR;
	payload: {
		errorMessage: string;
	};
}

export type DashboardActions =
	| GetDashboard
	| UpdateDashboard
	| DeleteDashboard
	| DashboardError
	| GetAllDashboardSuccess
	| DashboardStart
	| GetDashboardSuccess;
