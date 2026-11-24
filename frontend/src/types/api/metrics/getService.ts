import { Tags } from 'hooks/useResourceAttribute/types';

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
