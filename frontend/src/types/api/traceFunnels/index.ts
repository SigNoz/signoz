import { TagFilter } from '../queryBuilder/queryBuilderData';

export interface FunnelStepData {
	id: string;
	funnel_order: number;
	service_name: string;
	span_name: string;
	filters: TagFilter;
	latency_pointer: 'start' | 'end';
	latency_type: 'p95' | 'p99' | 'p90';
	has_errors: boolean;
	title?: string;
	description?: string;
}

export interface FunnelData {
	id: string;
	funnel_name: string;
	creation_timestamp: number;
	updated_timestamp: number;
	user: string;
	steps?: FunnelStepData[];
}

export interface CreateFunnelPayload {
	funnel_name: string;
	user?: string;
	creation_timestamp: number;
}

export interface CreateFunnelResponse {
	funnel_id: string;
}
