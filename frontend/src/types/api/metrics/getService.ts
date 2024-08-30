import { AxiosError } from 'axios';
import { Tags } from 'types/reducer/trace';

export interface Props {
	start: number;
	end: number;
	selectedTags: Tags[];
}

export interface ServicesList {
	serviceName: string;
	p99: number;
	avgDuration: number;
	numCalls: number;
	callRate: number;
	numErrors: number;
	errorRate: number;
	dataWarning?: {
		topLevelOps?: string[];
	};
}

export type PayloadProps = ServicesList[];

export interface QueryServiceProps {
	data: PayloadProps | undefined;
	error: AxiosError | null;
	isLoading: boolean;
}
