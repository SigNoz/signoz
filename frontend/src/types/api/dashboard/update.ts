import { Dashboard, DashboardData } from './getAll';

export type Props = {
	id: Dashboard['id'];
	data: DashboardData;
};

export interface PayloadProps {
	data: Dashboard;
	status: string;
}
