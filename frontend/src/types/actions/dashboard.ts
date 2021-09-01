import { Dashboard } from 'types/api/dashboard/getAll';

export const GET_DASHBOARD = 'GET_DASHBOARD';
export const UPDATE_DASHBOARD = 'UPDATE_DASHBOARD';
export const DELETE_DASHBOARD = 'DELETE_DASHBOARD';
export const GET_ALL_DASHBOARD = 'GET_ALL_DASHBOARD';

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

interface GetAllDashboard {
	type: typeof GET_ALL_DASHBOARD;
	payload: Dashboard[];
}

export type DashboardActions =
	| GetDashboard
	| UpdateDashboard
	| DeleteDashboard
	| GetAllDashboard;
