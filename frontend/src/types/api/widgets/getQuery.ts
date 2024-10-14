import { ILog } from '../logs/log';

export interface PayloadProps {
	status: 'success' | 'error';
	result: QueryData[];
}

export type ListItem = { timestamp: string; data: Omit<ILog, 'timestamp'> };

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
}

export interface SeriesItem {
	labels: {
		[key: string]: string;
	};
	labelsArray: { [key: string]: string }[];
	values: { timestamp: number; value: string }[];
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
}

export interface Props {
	query: string;
	step: string;
	start: string;
	end: string;
}
