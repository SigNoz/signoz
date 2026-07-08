import { useCallback, useState } from 'react';
import { useIsMutating, useQuery, useQueryClient } from 'react-query';
import {
	getDashboardV2,
	getGetDashboardV2QueryKey,
} from 'api/generated/services/dashboard';
import type { GetDashboardV2200 } from 'api/generated/services/sigNoz.schemas';

interface UseDashboardStaleCheck {
	// Server copy has a newer updatedAt than the loaded one, and not yet dismissed.
	showPrompt: boolean;
	reload: () => void;
	dismiss: () => void;
}

/**
 * Detects when the open dashboard changed on the server (another tab/user) without
 * touching the render cache: a separate query (own key) refetches on window focus
 * and its updatedAt is compared to the loaded copy's. Guarded by in-flight
 * mutations so an optimistic save doesn't false-positive.
 */
export function useDashboardStaleCheck(
	dashboardId: string,
	loadedUpdatedAt: string | undefined,
	refetch: () => void,
): UseDashboardStaleCheck {
	const isMutating = useIsMutating() > 0;
	const queryClient = useQueryClient();
	const [dismissedAt, setDismissedAt] = useState<string | null>(null);

	const { data } = useQuery(
		['dashboard-freshness', dashboardId],
		({ signal }) => getDashboardV2({ id: dashboardId }, signal),
		{
			enabled: !!dashboardId,
			refetchOnWindowFocus: true,
			refetchOnMount: false,
			retry: false,
			// Seed from the already-loaded dashboard so mount makes no extra GET; the
			// query only hits the network on a later window focus.
			initialData: () =>
				queryClient.getQueryData<GetDashboardV2200>(
					getGetDashboardV2QueryKey({ id: dashboardId }),
				),
		},
	);

	const serverUpdatedAt = data?.data?.updatedAt;
	const changed =
		!isMutating &&
		!!serverUpdatedAt &&
		!!loadedUpdatedAt &&
		serverUpdatedAt !== loadedUpdatedAt;

	const dismiss = useCallback(
		(): void => setDismissedAt(serverUpdatedAt ?? null),
		[serverUpdatedAt],
	);
	const reload = useCallback((): void => {
		refetch();
		setDismissedAt(null);
	}, [refetch]);

	return {
		showPrompt: changed && serverUpdatedAt !== dismissedAt,
		reload,
		dismiss,
	};
}
