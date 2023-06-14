export interface PayloadProps {
	status: 'success' | 'error';
	result: QueryData[];
}

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

//! remove any type
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface QueryDataV3 {
	list: any;
	queryName: string;
	legend?: string;
	series: SeriesItem[];
}

export interface Props {
	query: string;
	step: string;
	start: string;
	end: string;
}
