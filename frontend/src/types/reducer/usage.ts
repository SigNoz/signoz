import { PayloadProps } from 'types/api/usage/getUsage';

export interface UsageReducer {
	data: PayloadProps;
	loading: boolean;
	error: boolean;
	errorMessage: string;
	selectedService: string;
	step: number;
}
