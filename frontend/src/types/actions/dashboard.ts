import { Dashboard } from 'types/api/dashboard/getAll';

export const GET_DASHBOARD = 'GET_DASHBOARD';
export const UPDATE_DASHBOARD = 'UPDATE_DASHBOARD';
export const DELETE_DASHBOARD = 'DELETE_DASHBOARD';

export const GET_ALL_DASHBOARD_LOADING_START =
	'GET_ALL_DASHBOARD_LOADING_START';
export const GET_ALL_DASHBOARD_SUCCESS = 'GET_ALL_DASHBOARD_SUCCESS';
export const GET_ALL_DASHBOARD_ERROR = 'GET_ALL_DASHBOARD_ERROR';

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

interface GetAllDashboardStart {
	type: typeof GET_ALL_DASHBOARD_LOADING_START;
}

interface GetAllDashboardSuccess {
	type: typeof GET_ALL_DASHBOARD_SUCCESS;
	payload: Dashboard[];
}

interface GetAllDashboardError {
	type: typeof GET_ALL_DASHBOARD_ERROR;
	payload: {
		errorMessage: string;
	};
}

export type DashboardActions =
	| GetDashboard
	| UpdateDashboard
	| DeleteDashboard
	| GetAllDashboardStart
	| GetAllDashboardSuccess
	| GetAllDashboardError;
