export interface PayloadProps {
	status: 'success' | 'error';
	result: QueryData[];
}

export interface QueryData {
	metric?: {
		__name__: string;
		state: string;
	};
	values: [string, string][];
}

export interface Props {
	query: string;
	step: string;
	start: string;
	end: string;
}
