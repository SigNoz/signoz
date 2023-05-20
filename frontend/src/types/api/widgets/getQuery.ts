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

export interface QueryDataV3 {
	list: null;
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
