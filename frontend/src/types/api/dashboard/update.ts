import { Dashboard, DashboardData } from './getAll';

export type Props = {
	title: Dashboard['data']['title'];
	uuid: Dashboard['uuid'];
} & DashboardData;

export type PayloadProps = Dashboard;
