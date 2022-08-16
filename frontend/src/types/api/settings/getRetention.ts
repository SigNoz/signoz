import { TTTLType } from './common';

export type TStatus = '' | 'pending' | 'failed' | 'success';
export interface PayloadPropsMetrics {
	metrics_ttl_duration_hrs: number;
	metrics_move_ttl_duration_hrs?: number;
	status: TStatus;
	expected_metrics_move_ttl_duration_hrs?: number;
	expected_metrics_ttl_duration_hrs?: number;
}
export interface PayloadPropsTraces {
	traces_ttl_duration_hrs: number;
	traces_move_ttl_duration_hrs?: number;
	status: TStatus;
	expected_traces_move_ttl_duration_hrs?: number;
	expected_traces_ttl_duration_hrs?: number;
}

export interface PayloadPropsLogs {
	logs_ttl_duration_hrs: number;
	logs_move_ttl_duration_hrs?: number;
	status: TStatus;
	expected_logs_ttl_duration_hrs?: number;
	expected_logs_move_ttl_duration_hrs?: number;
}

export type Props = TTTLType;

export type PayloadProps<T> = T extends 'metrics'
	? PayloadPropsMetrics
	: T extends 'traces'
	? PayloadPropsTraces
	: T extends 'logs'
	? PayloadPropsLogs
	: never;
