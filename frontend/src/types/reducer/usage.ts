import { PayloadProps as ServicePayload } from 'types/api/metrics/getService';
import { PayloadProps } from 'types/api/usage/getUsage';

export interface Interval {
	value: number;
	chartDivideMultiplier: number;
	label: string;
	applicableOn: {
		value: number;
		label: string;
	}[];
}

export interface TimeOptions {
	value: number;
	label: string;
}
export interface UsageReducer {
	data: PayloadProps;
	loading: boolean;
	error: boolean;
	errorMessage: string;
	selectedService: string;
	allService: ServicePayload;
	selectedInterval: Interval;
	selectedTime: TimeOptions;
}
