export interface Props {
	query: string;
	start: string;
	end: string;
	step: number;
}

export type QueryEndpointValues = [number, string];

export interface QueryEndpointData {
	metric?: {
		__name__: string;
		[key: string]: string;
	};
	values: QueryEndpointValues[];
}

export interface PayloadProps {
	status: 'success' | 'error';
	result: QueryEndpointData[];
}
