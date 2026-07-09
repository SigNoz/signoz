import { Dashboard, DashboardData } from 'types/api/dashboard/getAll';

import overviewDashboardData from './overviewDashboard.json';

export const LLM_OVERVIEW_DASHBOARD_ID = 'llm-observability-overview';

// The JSON follows the v5 dashboard API payload, which is looser than the
// frontend Query/Widgets types (same trust boundary as an API response).
export const LLM_OVERVIEW_DASHBOARD: Dashboard = {
	id: LLM_OVERVIEW_DASHBOARD_ID,
	createdAt: '',
	updatedAt: '',
	createdBy: '',
	updatedBy: '',
	data: overviewDashboardData as unknown as DashboardData,
};
