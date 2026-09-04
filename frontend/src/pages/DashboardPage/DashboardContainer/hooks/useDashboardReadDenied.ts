import { StatusCodes } from 'http-status-codes';
import type { GetDashboardV2QueryError } from 'api/generated/services/dashboard';
import { toAPIError } from 'utils/errorUtils';

interface Args {
	/** `read` on this dashboard, already resolved by the page. */
	canRead: boolean;
	/** The check itself failed — fall open and let the GET decide. */
	hasPermissionError: boolean;
	isError: boolean;
	error: GetDashboardV2QueryError | null;
}

/**
 * A dashboard the caller can `list` but not `read` still appears in the list, so
 * opening it is a normal outcome rather than a failure.
 *
 * The permission itself is the primary signal — it is known before the tree
 * mounts, so the denial renders on the first paint instead of after a failed
 * request. The 403 is kept as a backstop for the window where a grant is revoked
 * while the cached check is still fresh.
 */
export function useDashboardReadDenied({
	canRead,
	hasPermissionError,
	isError,
	error,
}: Args): boolean {
	// A failed check is not a denial: fall through to the 403, so an authz outage
	// doesn't make every dashboard look forbidden.
	if (!canRead && !hasPermissionError) {
		return true;
	}
	if (!isError || !error) {
		return false;
	}
	return toAPIError(error).getHttpStatusCode() === StatusCodes.FORBIDDEN;
}
