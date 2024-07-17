/* eslint-disable sonarjs/no-duplicate-string */
import { QueryObserverResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	PayloadPropsLogs,
	PayloadPropsMetrics,
	PayloadPropsTraces,
	TStatus,
} from 'types/api/settings/getRetention';

export const generalSettingsProps = {
	metricsTtlValuesPayload: {
		metrics_ttl_duration_hrs: 720,
		metrics_move_ttl_duration_hrs: -1,
		expected_metrics_ttl_duration_hrs: 720,
		expected_metrics_move_ttl_duration_hrs: -1,
		status: 'success' as TStatus,
	},
	tracesTtlValuesPayload: {
		traces_ttl_duration_hrs: 360,
		traces_move_ttl_duration_hrs: -1,
		expected_traces_ttl_duration_hrs: 24,
		expected_traces_move_ttl_duration_hrs: -1,
		status: '' as TStatus,
	},
	logsTtlValuesPayload: {
		logs_ttl_duration_hrs: 360,
		logs_move_ttl_duration_hrs: -1,
		expected_logs_ttl_duration_hrs: 360,
		expected_logs_move_ttl_duration_hrs: -1,
		status: 'success' as TStatus,
	},
	getAvailableDiskPayload: [
		{
			name: 'default',
			type: 'local',
		},
	],
	metricsTtlValuesRefetch(): Promise<
		QueryObserverResult<
			ErrorResponse | SuccessResponse<PayloadPropsMetrics, unknown>,
			unknown
		>
	> {
		throw new Error('Function not implemented.');
	},
	tracesTtlValuesRefetch(): Promise<
		QueryObserverResult<
			ErrorResponse | SuccessResponse<PayloadPropsTraces, unknown>,
			unknown
		>
	> {
		throw new Error('Function not implemented.');
	},
	logsTtlValuesRefetch(): Promise<
		QueryObserverResult<
			ErrorResponse | SuccessResponse<PayloadPropsLogs, unknown>,
			unknown
		>
	> {
		throw new Error('Function not implemented.');
	},
};
