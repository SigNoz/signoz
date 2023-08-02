import { Dashboard, IDashboardVariable } from 'types/api/dashboard/getAll';

export const getSelectedDashboard = (dashboard: Dashboard[]): Dashboard => {
	if (dashboard.length > 0) {
		return dashboard[0];
	}
	return {} as Dashboard;
};

export const getSelectedDashboardVariable = (
	dashboard: Dashboard[],
): Record<string, IDashboardVariable> => {
	if (dashboard.length > 0) {
		const { variables } = dashboard[0].data;
		return variables;
	}
	return {};
};
