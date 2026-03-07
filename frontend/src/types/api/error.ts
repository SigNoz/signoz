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

	getErrorMessage(): string {
		return this.error.error.message;
	}

	getErrorCode(): string {
		return this.error.error.code;
	}

	getErrorDetails(): ErrorResponseV2 {
		return this.error;
	}
}

export default APIError;
