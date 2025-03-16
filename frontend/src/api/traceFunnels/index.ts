// import axios from 'api';
import axios, { AxiosResponse } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	CreateFunnelPayload,
	CreateFunnelResponse,
	FunnelData,
} from 'types/api/traceFunnels';

const FUNNELS_BASE_PATH = 'http://localhost:8080/api/v1/trace-funnels';

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

export const getFunnelsList = async (): Promise<
	SuccessResponse<FunnelData[]> | ErrorResponse
> => {
	const response: AxiosResponse = await axios.get(`${FUNNELS_BASE_PATH}/list`);

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
