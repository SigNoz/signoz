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
	// Prompt only when the server copy is STRICTLY NEWER than the one we're viewing —
	// not merely different. Your own edits advance `loadedUpdatedAt` immediately (the
	// optimistic patch writes the new updatedAt into the render cache), while the
	// freshness query lags until the next window focus. A `!==` check reads that gap —
	// "I moved ahead of the stale freshness copy" — as an external change, firing a
	// false prompt on every save that persists across in-app navigation. "Newer than"
	// only trips for a version we haven't loaded, i.e. a genuine external change.
	const changed =
		!isMutating &&
		!!serverUpdatedAt &&
		!!loadedUpdatedAt &&
		new Date(serverUpdatedAt).getTime() > new Date(loadedUpdatedAt).getTime();

	const dismiss = useCallback(
		(): void => setDismissedAt(serverUpdatedAt ?? null),
		[serverUpdatedAt],
	);
	// Reload is Dismiss + refetch: close the prompt immediately on the user's action
	// rather than waiting for the refetched `loadedUpdatedAt` to converge with
	// `serverUpdatedAt` (two separate queries — that convergence is racy and can leave
	// the dialog stuck open). A genuinely newer server version re-prompts, since it
	// won't equal the version we just acknowledged.
	const reload = useCallback((): void => {
		setDismissedAt(serverUpdatedAt ?? null);
		refetch();
	}, [refetch, serverUpdatedAt]);

	return {
		showPrompt: changed && serverUpdatedAt !== dismissedAt,
		reload,
		dismiss,
	};
}
