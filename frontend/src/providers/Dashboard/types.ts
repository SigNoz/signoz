import { Layout } from 'react-grid-layout';
import { UseQueryResult } from 'react-query';
import { Dashboard } from 'types/api/dashboard/getAll';

export interface IDashboardContext {
	isDashboardSliderOpen: boolean;
	handleToggleDashboardSlider: (value: boolean) => void;
	dashboardResponse: UseQueryResult<Dashboard, unknown>;
	selectedDashboard: Dashboard | undefined;
	dashboardId: string;
	layouts: Layout[];
}
