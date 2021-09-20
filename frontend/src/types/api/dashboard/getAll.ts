import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { timePreferenceType } from 'container/NewWidget/RightContainer/timeItems';

import { QueryData } from '../widgets/getQuery';

export type PayloadProps = Dashboard[];

export interface Dashboard {
	id: number;
	uuid: string;
	created_at: string;
	updated_at: string;
	data: DashboardData;
}

export interface DashboardData {
	description?: string;
	tags?: string[];
	name?: string;
	widgets?: Widgets[];
	title: string;
}

export interface Widgets {
	isStacked: boolean;
	id: string;
	panelTypes: GRAPH_TYPES;
	title: string;
	description: string;
	opacity: string;
	nullZeroValues: string;
	timePreferance: timePreferenceType;
	query: Query[];
	queryData: {
		loading: boolean;
		error: boolean;
		errorMessage: string;
		data: {
			legend?: string;
			queryData: QueryData[];
			query: string;
		}[];
	};
	stepSize?: number;
}

export interface Query {
	query: string;
	legend?: string;
}
