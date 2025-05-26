import { TagFilter } from '../queryBuilder/queryBuilderData';

export enum LatencyOptions {
	P99 = 'p99',
	P95 = 'p95',
	P90 = 'p90',
}

export type LatencyOptionsType = 'p99' | 'p95' | 'p90';
export interface FunnelStepData {
	id: string;
	step_order: number;
	service_name: string;
	span_name: string;
	filters: TagFilter;
	latency_pointer: 'start' | 'end';
	latency_type?: LatencyOptionsType;
	has_errors: boolean;
	name?: string;
	description?: string;
}

export interface FunnelData {
	funnel_id: string;
	funnel_name: string;
	created_at: number;
	updated_at: number;
	user_email: string;
	description?: string;
	steps?: FunnelStepData[];
}

export interface CreateFunnelPayload {
	funnel_name: string;
	user?: string;
	timestamp: number;
}

export interface CreateFunnelResponse {
	funnel_id: string;
}
