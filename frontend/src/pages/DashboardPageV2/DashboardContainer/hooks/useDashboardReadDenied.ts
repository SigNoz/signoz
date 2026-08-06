import { StatusCodes } from 'http-status-codes';
import type { GetDashboardV2QueryError } from 'api/generated/services/dashboard';
import { toAPIError } from 'utils/errorUtils';

/**
 * A dashboard the caller can `list` but not `read` still appears in the list, so
 * opening it is a normal outcome rather than a failure. Detect that 403 so the
 * page can explain it instead of showing a generic load error.
 */
export function useDashboardReadDenied(
	isError: boolean,
	error: GetDashboardV2QueryError | null,
): boolean {
	if (!isError || !error) {
		return false;
	}
	return toAPIError(error).getHttpStatusCode() === StatusCodes.FORBIDDEN;
}
