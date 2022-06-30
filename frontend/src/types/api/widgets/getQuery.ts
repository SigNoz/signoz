export interface PayloadProps {
	status: 'success' | 'error';
	result: QueryData[];
}

export interface QueryData {
	metric?: {
		__name__: string;
		[key: string]: string;
	};
	queryName: string;
	legend?: string;
	values: [number, string][];
}

export interface Props {
	query: string;
	step: string;
	start: string;
	end: string;
}
