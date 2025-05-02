import axios from 'api';
import { AxiosResponse } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	CreateFunnelPayload,
	CreateFunnelResponse,
	FunnelData,
} from 'types/api/traceFunnels';

const FUNNELS_BASE_PATH = '/trace-funnels';

export const createFunnel = async (
	payload: CreateFunnelPayload,
): Promise<SuccessResponse<CreateFunnelResponse> | ErrorResponse> => {
	const response: AxiosResponse = await axios.post(
		`${FUNNELS_BASE_PATH}/new-funnel`,
		payload,
	);

	return {
		statusCode: 200,
		error: null,
		message: 'Funnel created successfully',
		payload: response.data,
	};
};

interface GetFunnelsListParams {
	search?: string;
}

export const getFunnelsList = async ({
	search = '',
}: GetFunnelsListParams = {}): Promise<
	SuccessResponse<FunnelData[]> | ErrorResponse
> => {
	const params = new URLSearchParams();
	if (search.length) {
		params.set('search', search);
	}

	const response: AxiosResponse = await axios.get(
		`${FUNNELS_BASE_PATH}/list${
			params.toString() ? `?${params.toString()}` : ''
		}`,
	);

	return {
		statusCode: 200,
		error: null,
		message: '',
		payload: response.data,
	};
};

export const getFunnelById = async (
	funnelId: string,
): Promise<SuccessResponse<FunnelData> | ErrorResponse> => {
	const response: AxiosResponse = await axios.get(
		`${FUNNELS_BASE_PATH}/get/${funnelId}`,
	);

	return {
		statusCode: 200,
		error: null,
		message: '',
		payload: response.data,
	};
};

interface RenameFunnelPayload {
	id: string;
	funnel_name: string;
}

export const renameFunnel = async (
	payload: RenameFunnelPayload,
): Promise<SuccessResponse<FunnelData> | ErrorResponse> => {
	const response: AxiosResponse = await axios.put(
		`${FUNNELS_BASE_PATH}/${payload.id}/update`,
		{ funnel_name: payload.funnel_name },
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
		`${FUNNELS_BASE_PATH}/delete/${payload.id}`,
	);

	return {
		statusCode: 200,
		error: null,
		message: 'Funnel deleted successfully',
		payload: response.data,
	};
};
