import { Dashboard, DashboardData } from './getAll';

export type Props =
	| {
			title: Dashboard['data']['title'];
	  }
	| DashboardData;

export type PayloadProps = Dashboard;
