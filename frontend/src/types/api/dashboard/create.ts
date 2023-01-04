import { Dashboard, DashboardData } from './getAll';

export type Props =
	| {
			title: Dashboard['data']['title'];
			uploadedGrafana: boolean;
	  }
	| { DashboardData: DashboardData; uploadedGrafana: boolean };

export type PayloadProps = Dashboard;
