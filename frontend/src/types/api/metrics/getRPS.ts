export interface Props {
	service: string;
	start: string;
	end: string;
	step: number;
}

export type rpsEndpointValues = [number, string];

export interface rpsEndpointData {
	metric?: {
		__name__: string;
		[key: string]: string;
	};
	values: rpsEndpointValues[];
}

export interface PayloadProps {
	status: 'success' | 'error';
	result: rpsEndpointData[];
}
