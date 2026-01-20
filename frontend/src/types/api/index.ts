import { StatusCodes } from 'http-status-codes';
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

// Standardize SuccessResponse and Error Response
export interface AdditionalErrors {
	message: string;
}

export interface ErrorV2 {
	code: string;
	message: string;
	url: string;
	errors: AdditionalErrors[];
}

export interface ErrorV2Resp {
	error: ErrorV2;
}

export interface ErrorResponseV2 {
	httpStatusCode: StatusCodes;
	error: ErrorV2;
}

export interface SuccessResponseV2<T> {
	httpStatusCode: StatusCodes;
	data: T;
}

export interface AdditionalWarnings {
	message: string;
}

export interface Warning {
	code: string;
	message: string;
	url: string;
	warnings: AdditionalWarnings[];
}

export interface RawSuccessResponse<T> {
	status: string;
	data: T;
}
