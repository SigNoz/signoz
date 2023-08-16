import { ILog } from '../logs/log';

export interface PayloadProps {
	status: 'success' | 'error';
	result: QueryData[];
}

export type ListItem = { timestamp: string; data: Omit<ILog, 'timestamp'> };

export interface QueryData {
	metric: {
		[key: string]: string;
	};
	queryName: string;
	legend?: string;
	values: [number, string][];
}

export interface SeriesItem {
	labels: {
		[key: string]: string;
	};
	values: { timestamp: number; value: string }[];
}

export interface QueryDataV3 {
	list: ListItem[] | null;
	queryName: string;
	legend?: string;
	series: SeriesItem[] | null;
}

export interface Props {
	query: string;
	step: string;
	start: string;
	end: string;
}
