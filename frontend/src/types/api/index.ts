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

export interface SuccessResponseV3<T> {
	status: SuccessStatusCode;
	data: {
		resultType: string;
		result: [
			{
				queryName: string;
				series: null;
				list: T;
			},
		];
	};
	error: null;
}

export interface ErrorResponseV3 extends ErrorResponse {
	data?: {
		statusCode: ErrorStatusCode;
		payload: null;
		error: string;
		message: null;
		result: null;
	};
	status?: number;
}
