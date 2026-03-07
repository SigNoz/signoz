import { ILog } from '../logs/log';

export interface PayloadProps {
	status: 'success' | 'error';
	result: QueryData[];
}

export type ListItem = {
	timestamp: string;
	data: Omit<ILog, 'timestamp' | 'span_id'>;
};

export interface QueryData {
	lowerBoundSeries?: [number, string][];
	upperBoundSeries?: [number, string][];
	predictedSeries?: [number, string][];
	anomalyScores?: [number, string][];
	metric: {
		[key: string]: string;
	};
	queryName: string;
	legend?: string;
	values: [number, string][];
	quantity?: number[];
	unit?: string;
	table?: {
		rows: {
			data: {
				[key: string]: any;
			};
		}[];
		columns: {
			[key: string]: string;
		}[];
	};
	metaData?: {
		alias: string;
		index: number;
		queryName: string;
	};
}

export interface SeriesItem {
	labels: {
		[key: string]: string;
	};
	labelsArray: { [key: string]: string }[];
	values: { timestamp: number; value: string }[];
	metaData?: {
		alias: string;
		index: number;
		queryName: string;
	};
}

export interface Column {
	name: string;
	queryName: string;
	isValueColumn: boolean;
	id?: string;
}

export interface QueryDataV3 {
	list: ListItem[] | null;
	queryName: string;
	legend?: string;
	series: SeriesItem[] | null;
	quantity?: number;
	unitPrice?: number;
	unit?: string;
	lowerBoundSeries?: SeriesItem[] | null;
	upperBoundSeries?: SeriesItem[] | null;
	predictedSeries?: SeriesItem[] | null;
	anomalyScores?: SeriesItem[] | null;
	isAnomaly?: boolean;
	table?: {
		rows: {
			data: {
				[key: string]: any;
			};
		}[];
		columns: Column[];
	};
}

export interface Props {
	query: string;
	step: string;
	start: string;
	end: string;
}
