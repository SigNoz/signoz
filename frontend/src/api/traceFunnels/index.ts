import axios from 'api';
import { AxiosResponse } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	CreateFunnelPayload,
	CreateFunnelResponse,
	FunnelData,
	FunnelStepData,
} from 'types/api/traceFunnels';

const FUNNELS_BASE_PATH = '/trace-funnels';

export const createFunnel = async (
	payload: CreateFunnelPayload,
): Promise<SuccessResponse<CreateFunnelResponse> | ErrorResponse> => {
	const response: AxiosResponse = await axios.post(
		`${FUNNELS_BASE_PATH}/new`,
		payload,
	);

	return {
		statusCode: 200,
		error: null,
		message: 'Funnel created successfully',
		payload: response.data,
	};
};

export const getFunnelsList = async (): Promise<
	SuccessResponse<FunnelData[]> | ErrorResponse
> => {
	const response: AxiosResponse = await axios.get(`${FUNNELS_BASE_PATH}/list`);

	return {
		statusCode: 200,
		error: null,
		message: '',
		payload: response.data.data,
	};
};

export const getFunnelById = async (
	funnelId?: string,
): Promise<SuccessResponse<FunnelData> | ErrorResponse> => {
	const response: AxiosResponse = await axios.get(
		`${FUNNELS_BASE_PATH}/${funnelId}`,
	);
	return {
		statusCode: 200,
		error: null,
		message: '',
		payload: response.data.data,
	};
};

export interface RenameFunnelPayload {
	funnel_id: string;
	funnel_name: string;
	timestamp: number;
}

export const renameFunnel = async (
	payload: RenameFunnelPayload,
): Promise<SuccessResponse<FunnelData> | ErrorResponse> => {
	const response: AxiosResponse = await axios.put(
		`${FUNNELS_BASE_PATH}/${payload.funnel_id}`,
		payload,
	);

	return {
		statusCode: 200,
		error: null,
		message: 'Funnel renamed successfully',
		payload: response.data,
	};
};

interface DeleteFunnelPayload {
	id: string;
}

export const deleteFunnel = async (
	payload: DeleteFunnelPayload,
): Promise<SuccessResponse<FunnelData> | ErrorResponse> => {
	const response: AxiosResponse = await axios.delete(
		`${FUNNELS_BASE_PATH}/${payload.id}`,
	);

	return {
		statusCode: 200,
		error: null,
		message: 'Funnel deleted successfully',
		payload: response.data,
	};
};

export interface UpdateFunnelStepsPayload {
	funnel_id: string;
	steps: FunnelStepData[];
	timestamp: number;
}

export const updateFunnelSteps = async (
	payload: UpdateFunnelStepsPayload,
): Promise<SuccessResponse<FunnelData> | ErrorResponse> => {
	const response: AxiosResponse = await axios.put(
		`${FUNNELS_BASE_PATH}/steps/update`,
		payload,
	);

	return {
		statusCode: 200,
		error: null,
		message: 'Funnel steps updated successfully',
		payload: response.data.data,
	};
};

export interface ValidateFunnelPayload {
	start_time: number;
	end_time: number;
}

export interface ValidateFunnelResponse {
	status: string;
	data: Array<{
		timestamp: string;
		data: {
			trace_id: string;
		};
	}> | null;
}

export const validateFunnelSteps = async (
	funnelId: string,
	payload: ValidateFunnelPayload,
	signal?: AbortSignal,
): Promise<SuccessResponse<ValidateFunnelResponse> | ErrorResponse> => {
	const response = await axios.post(
		`${FUNNELS_BASE_PATH}/${funnelId}/analytics/validate`,
		payload,
		{ signal },
	);

	return {
		statusCode: 200,
		error: null,
		message: '',
		payload: response.data,
	};
};

export interface UpdateFunnelStepDetailsPayload {
	funnel_id: string;
	steps: Array<{
		step_name: string;
		description: string;
	}>;
	updated_at: number;
}

interface UpdateFunnelDescriptionPayload {
	funnel_id: string;
	description: string;
}

export const saveFunnelDescription = async (
	payload: UpdateFunnelDescriptionPayload,
): Promise<SuccessResponse<FunnelData> | ErrorResponse> => {
	const response: AxiosResponse = await axios.post(
		`${FUNNELS_BASE_PATH}/save`,
		payload,
	);

	return {
		statusCode: 200,
		error: null,
		message: 'Funnel description updated successfully',
		payload: response.data,
	};
};

export interface FunnelOverviewPayload {
	start_time: number;
	end_time: number;
	step_start?: number;
	step_end?: number;
}

export interface FunnelOverviewResponse {
	status: string;
	data: Array<{
		timestamp: string;
		data: {
			avg_duration: number;
			avg_rate: number;
			conversion_rate: number | null;
			errors: number;
			p99_latency: number;
		};
	}>;
}

export const getFunnelOverview = async (
	funnelId: string,
	payload: FunnelOverviewPayload,
	signal?: AbortSignal,
): Promise<SuccessResponse<FunnelOverviewResponse> | ErrorResponse> => {
	const response = await axios.post(
		`${FUNNELS_BASE_PATH}/${funnelId}/analytics/overview`,
		payload,
		{
			signal,
		},
	);

	return {
		statusCode: 200,
		error: null,
		message: '',
		payload: response.data,
	};
};

export interface SlowTracesPayload {
	start_time: number;
	end_time: number;
	step_a_order: number;
	step_b_order: number;
}

export interface SlowTraceData {
	status: string;
	data: Array<{
		timestamp: string;
		data: {
			duration_ms: string;
			span_count: number;
			trace_id: string;
		};
	}>;
}

export const getFunnelSlowTraces = async (
	funnelId: string,
	payload: SlowTracesPayload,
	signal?: AbortSignal,
): Promise<SuccessResponse<SlowTraceData> | ErrorResponse> => {
	const response = await axios.post(
		`${FUNNELS_BASE_PATH}/${funnelId}/analytics/slow-traces`,
		payload,
		{
			signal,
		},
	);

	return {
		statusCode: 200,
		error: null,
		message: '',
		payload: response.data,
	};
};
export interface ErrorTracesPayload {
	start_time: number;
	end_time: number;
	step_a_order: number;
	step_b_order: number;
}

export interface ErrorTraceData {
	status: string;
	data: Array<{
		timestamp: string;
		data: {
			duration_ms: string;
			span_count: number;
			trace_id: string;
		};
	}>;
}

export const getFunnelErrorTraces = async (
	funnelId: string,
	payload: ErrorTracesPayload,
	signal?: AbortSignal,
): Promise<SuccessResponse<ErrorTraceData> | ErrorResponse> => {
	const response: AxiosResponse = await axios.post(
		`${FUNNELS_BASE_PATH}/${funnelId}/analytics/error-traces`,
		payload,
		{
			signal,
		},
	);

	return {
		statusCode: 200,
		error: null,
		message: '',
		payload: response.data,
	};
};

export interface FunnelStepsPayload {
	start_time: number;
	end_time: number;
}

export interface FunnelStepGraphMetrics {
	[key: `total_s${number}_spans`]: number;
	[key: `total_s${number}_errored_spans`]: number;
}

export interface FunnelStepsResponse {
	status: string;
	data: Array<{
		timestamp: string;
		data: FunnelStepGraphMetrics;
	}>;
}

export const getFunnelSteps = async (
	funnelId: string,
	payload: FunnelStepsPayload,
	signal?: AbortSignal,
): Promise<SuccessResponse<FunnelStepsResponse> | ErrorResponse> => {
	const response = await axios.post(
		`${FUNNELS_BASE_PATH}/${funnelId}/analytics/steps`,
		payload,
		{ signal },
	);

	return {
		statusCode: 200,
		error: null,
		message: '',
		payload: response.data,
	};
};
