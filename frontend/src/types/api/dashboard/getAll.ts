export type PayloadProps = Dashboard[];

export interface Dashboard {
	id: number;
	uuid: string;
	created_at: string;
	updated_at: string;
	data: DashboardData;
	title: string;
}

export interface DashboardData {
	description: string;
	opacity: number;
	tags?: string[];
	name: string;
	widgets: [];
}
