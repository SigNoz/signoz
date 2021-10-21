import { ErrorStatusCode, SuccessStatusCode } from 'types/common';

export interface ErrorResponse {
	statusCode: ErrorStatusCode;
	payload: null;
	error: string;
	message: null;
}

export interface SuccessResponse<T> {
	statusCode: SuccessStatusCode;
	message: string;
	payload: T;
	error: null;
}
