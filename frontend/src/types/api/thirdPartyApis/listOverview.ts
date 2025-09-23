import { APIMonitoringResponseColumn } from 'container/ApiMonitoring/types';

import { RequestType } from '../v5/queryRange';

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
		data: {
			results: {
				columns: APIMonitoringResponseColumn[];
				data: string[][];
			}[];
		};
		meta: {
			rowsScanned: number;
			bytesScanned: number;
			durationMs: number;
		};
		type: RequestType;
	};
	status: string;
}
