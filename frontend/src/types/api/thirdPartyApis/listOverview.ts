import { APIMonitoringResponseRow } from 'container/ApiMonitoring/types';

export interface Props {
	start: number;
	end: number;
	show_ip: boolean;
	filter: {
		expression: string;
	};
}

export interface PayloadProps {
	data: {
		result: {
			table: {
				columns: {
					isValueColumn: boolean;
					name: string;
					queryName: string;
				}[];
				rows: APIMonitoringResponseRow[];
			};
		}[];
	};
	status: string;
}
