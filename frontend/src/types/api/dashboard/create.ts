import { Dashboard, DashboardData } from './getAll';

export type Props =
	| {
			title: Dashboard['data']['title'];
			uploadedGrafana: boolean;
			version?: string;
	  }
	| { DashboardData: DashboardData; uploadedGrafana: boolean };

export type PayloadProps = Dashboard;
