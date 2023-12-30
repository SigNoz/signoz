import axios from 'api';
import { ApiResponse } from 'types/api';
import { Dashboard } from 'types/api/dashboard/getAll';

export const getAllDashboardList = (): Promise<Dashboard[]> =>
	axios
		.get<ApiResponse<Dashboard[]>>('/dashboards')
		.then((res) => res.data.data);
