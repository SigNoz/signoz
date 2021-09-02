import { Dashboard, DashboardData } from './getAll';

export type Props = {
	title: Dashboard['title'];
	data: DashboardData;
	uuid: Dashboard['uuid'];
};

export type PayloadProps = Dashboard;
