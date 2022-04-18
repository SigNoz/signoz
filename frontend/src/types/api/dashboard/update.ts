import { Dashboard, DashboardData } from './getAll';

export type Props = {
	uuid: Dashboard['uuid'];
	data: DashboardData;
};

export type PayloadProps = Dashboard;
