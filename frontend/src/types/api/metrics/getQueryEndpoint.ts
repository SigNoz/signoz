export interface Props {
	query: string;
	start: string;
	end: string;
	step: number;
}

export type queryEndpointValues = [number, string];

export interface queryEndpointData {
	metric?: {
		__name__: string;
		[key: string]: string;
	};
	values: queryEndpointValues[];
}

export interface PayloadProps {
	status: 'success' | 'error';
	result: queryEndpointData[];
}
