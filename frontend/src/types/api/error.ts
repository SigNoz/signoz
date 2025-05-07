import { ErrorResponseV2 } from '.';

class APIError extends Error {
	error: ErrorResponseV2;

	constructor(error: ErrorResponseV2) {
		super(error.error.message);
		this.error = error;
	}
}

export default APIError;
