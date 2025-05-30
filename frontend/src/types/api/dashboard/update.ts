import { Dashboard, DashboardData } from './getAll';

export type UpdateDashboardData = {
	data?: DashboardData;
	locked?: boolean;
};

export type Props = {
	id: Dashboard['id'];
	data: UpdateDashboardData;
};

export interface PayloadProps {
	data: Dashboard;
	status: string;
}
