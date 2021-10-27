import { PayloadProps } from 'types/api/trace/getServiceList';

export interface TagItem {
	key: string;
	value: string;
	operator: 'equals' | 'contains' | 'regex';
}

export interface LatencyValue {
	min: string;
	max: string;
}

export interface TraceReducer {
	tags: TagItem[];
	service: string;
	latency: LatencyValue;
	operation: string;
	kind: string;
	errorMessage: string;
	serviceList: PayloadProps;
	error: boolean;
	loading: boolean;
}
