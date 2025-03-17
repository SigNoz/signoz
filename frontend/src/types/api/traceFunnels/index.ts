import { TagFilter } from '../queryBuilder/queryBuilderData';

export interface FunnelStep {
	id: string;
	funnel_order: number;
	service_name: string;
	span_name: string;
	filters: TagFilter;
	latency_pointer: 'start' | 'end';
	latency_type: 'p95' | 'p99';
	has_errors: boolean;
}

export interface FunnelData {
	id: string;
	funnel_name: string;
	creation_timestamp: number;
	update_timestamp: number;
	user: string;
	steps?: FunnelStep[];
}

export interface CreateFunnelPayload {
	funnel_name: string;
	user?: string;
	creation_timestamp: number;
}

export interface CreateFunnelResponse {
	funnel_id: string;
}
