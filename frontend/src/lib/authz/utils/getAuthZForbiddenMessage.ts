import { StatusCodes } from 'http-status-codes';
import type APIError from 'types/api/error';

/** The backend's code for a request a permission check refused. */
const AUTHZ_FORBIDDEN_CODE = 'authz_forbidden';

/** The server's denial message, when a permission check refused the request. */
export function getAuthZForbiddenMessage(
	error: APIError | undefined,
): string | undefined {
	if (
		error?.getHttpStatusCode() === StatusCodes.FORBIDDEN &&
		error.getErrorCode() === AUTHZ_FORBIDDEN_CODE
	) {
		return error.getErrorMessage();
	}
	return undefined;
}
