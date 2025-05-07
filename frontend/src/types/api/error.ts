import { StatusCodes } from 'http-status-codes';

import { ErrorResponseV2 } from '.';

class APIError extends Error {
	error: ErrorResponseV2;

	constructor(error: ErrorResponseV2) {
		super(error.error.message);
		this.error = error;
	}

	getHttpStatusCode(): StatusCodes {
		return this.error.httpStatusCode;
	}
}

export default APIError;
