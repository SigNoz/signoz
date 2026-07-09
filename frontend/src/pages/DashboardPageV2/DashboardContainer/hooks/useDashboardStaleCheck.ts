import { getDashboardV2 } from 'api/generated/services/dashboard';
import { useCallback, useEffect, useState } from 'react';
import { useIsMutating } from 'react-query';

interface UseDashboardStaleCheck {
	// Server copy is newer than the loaded one, and not yet dismissed.
	showPrompt: boolean;
	reload: () => void;
	dismiss: () => void;
}

/**
 * Detects when the open dashboard changed on the server (another tab/user) without touching
 * the render cache.
 *
 * The page's own dashboard query is frozen (`staleTime: Infinity`) so it never re-fetches and
 * can't observe external changes. Rather than relying on react-query's `refetchOnWindowFocus`
 * — unreliable for a query that only holds seeded `initialData` and never fetched — we probe
 * the server's current `updatedAt` explicitly on `visibilitychange`: no request on first load
 * (the page fetch already ran), exactly one request each time the tab regains visibility.
 *
 * Guarded by in-flight mutations so an optimistic save doesn't false-positive.
 */
export function useDashboardStaleCheck(
	dashboardId: string,
	loadedUpdatedAt: string | undefined,
	refetch: () => void,
): UseDashboardStaleCheck {
	const isMutating = useIsMutating() > 0;
	const [serverUpdatedAt, setServerUpdatedAt] = useState<string | undefined>();
	const [dismissedAt, setDismissedAt] = useState<string | null>(null);

	useEffect(() => {
		if (!dashboardId) {
			return undefined;
		}
		const probe = async (): Promise<void> => {
			// Only when the tab comes back into view — `visibilitychange` also fires on the
			// hidden transition, which we skip.
			if (document.visibilityState !== 'visible') {
				return;
			}
			try {
				const response = await getDashboardV2({ id: dashboardId });
				setServerUpdatedAt(response.data?.updatedAt);
			} catch {
				// A failed freshness probe must never surface to the viewer.
			}
		};
		document.addEventListener('visibilitychange', probe);
		return (): void => document.removeEventListener('visibilitychange', probe);
	}, [dashboardId]);

	// Prompt only when the server copy is STRICTLY NEWER than the one we're viewing — not merely
	// different. Your own edits advance `loadedUpdatedAt` immediately (the optimistic patch
	// writes the new updatedAt into the render cache), so a `!==` check would read your own save
	// as an external change. "Newer than" only trips for a version we haven't loaded.
	const changed =
		!isMutating &&
		!!serverUpdatedAt &&
		!!loadedUpdatedAt &&
		new Date(serverUpdatedAt).getTime() > new Date(loadedUpdatedAt).getTime();

	const dismiss = useCallback(
		(): void => setDismissedAt(serverUpdatedAt ?? null),
		[serverUpdatedAt],
	);
	// Reload is Dismiss + refetch: close the prompt immediately on the user's action and pull the
	// latest into the render cache. A genuinely newer server version re-prompts.
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
