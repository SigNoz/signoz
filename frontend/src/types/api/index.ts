import { ErrorStatusCode, SuccessStatusCode } from 'types/common';

export type ApiResponse<T> = { data: T };

export interface ErrorResponse {
	statusCode: ErrorStatusCode;
	payload: null;
	error: string;
	message: string | null;
	body?: string | null;
}

export interface SuccessResponse<T, P = unknown> {
	statusCode: SuccessStatusCode;
	message: string;
	payload: T;
	error: null;
	params?: P;
}
