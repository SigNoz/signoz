export interface Props {
	service: string;
	start: string;
	end: string;
	step: number;
}

export type errorPercentageValue = [number, string];

export interface errorPercentageEndpointData {
	metric?: {
		__name__: string;
		[key: string]: string;
	};
	values: errorPercentageValue[];
}

export interface PayloadProps {
	status: 'success' | 'error';
	result: errorPercentageEndpointData[];
}

export interface Props {
	service: string;
	start: string;
	end: string;
	step: number;
}
