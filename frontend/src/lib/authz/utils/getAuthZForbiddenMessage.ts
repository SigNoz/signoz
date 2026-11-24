import type { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import type { AxiosError } from 'axios';
import { StatusCodes } from 'http-status-codes';

/** The backend's code for a request a permission check refused. */
const AUTHZ_FORBIDDEN_CODE = 'authz_forbidden';

/** The server's denial message, when a permission check refused the request. */
export function getAuthZForbiddenMessage(
	error: AxiosError<RenderErrorResponseDTO> | null,
): string | undefined {
	const response = error?.response;
	if (
		response?.status === StatusCodes.FORBIDDEN &&
		response.data?.error?.code === AUTHZ_FORBIDDEN_CODE
	) {
		return response.data.error.message;
	}
	return undefined;
}
