import { getDashboardV2 } from 'api/generated/services/dashboard';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import { isEqual } from 'lodash-es';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIsMutating } from 'react-query';

interface UseDashboardStaleCheck {
	// Server copy is a newer version with different content, and not yet dismissed.
	showPrompt: boolean;
	reload: () => void;
	dismiss: () => void;
}

/**
 * Detects when the open dashboard changed on the server (another tab/user) without touching
 * the render cache.
 *
 * The page's own dashboard query is frozen (`staleTime: Infinity`) so it never re-fetches and
 * can't observe external changes. We probe the server's current copy explicitly whenever the
 * page comes back into view — `visibilitychange` (switching browser tabs) and window `focus`
 * (switching to another app and back). No request on first load (the page fetch already ran),
 * exactly one each time the page is returned to.
 *
 * We prompt only for a genuine CONTENT change: the server copy must be strictly newer than the
 * one we're viewing AND its `spec` must actually differ. `updatedAt` alone is unreliable — it
 * advances on our own edits (filtered by "strictly newer") and on metadata-only writes such as
 * lock/unlock, which bump `updatedAt` without changing anything the viewer sees (filtered by
 * the `spec` comparison). In-flight mutations are ignored so an optimistic save can't
 * false-positive.
 */
export function useDashboardStaleCheck(
	dashboard: DashboardtypesGettableDashboardV2DTO,
	refetch: () => void,
): UseDashboardStaleCheck {
	const { id: dashboardId, updatedAt: loadedUpdatedAt, spec: loadedSpec } =
		dashboard;
	const isMutating = useIsMutating() > 0;
	const [server, setServer] = useState<DashboardtypesGettableDashboardV2DTO>();
	const [dismissedAt, setDismissedAt] = useState<string | null>(null);

	useEffect(() => {
		if (!dashboardId) {
			return undefined;
		}
		const probe = async (): Promise<void> => {
			// `visibilitychange` also fires on the hidden transition — only probe on return.
			if (document.visibilityState !== 'visible') {
				return;
			}
			try {
				const response = await getDashboardV2({ id: dashboardId });
				setServer(response.data);
			} catch {
				// A failed freshness probe must never surface to the viewer.
			}
		};
		// `visibilitychange` covers switching browser tabs; `focus` covers switching to
		// another app/window and back (where the tab stays "visible" and visibilitychange
		// never fires). Both are needed to catch every "came back to the page".
		document.addEventListener('visibilitychange', probe);
		window.addEventListener('focus', probe);
		return (): void => {
			document.removeEventListener('visibilitychange', probe);
			window.removeEventListener('focus', probe);
		};
	}, [dashboardId]);

	const serverUpdatedAt = server?.updatedAt;

	// The rendered content actually differs. Order-independent deep compare, so an optimistic
	// patch's key reordering doesn't read as a change.
	const specDiffers = useMemo(
		() => !!server && !isEqual(server.spec, loadedSpec),
		[server, loadedSpec],
	);

	const changed =
		!isMutating &&
		!!serverUpdatedAt &&
		!!loadedUpdatedAt &&
		new Date(serverUpdatedAt).getTime() > new Date(loadedUpdatedAt).getTime() &&
		specDiffers;

	const dismiss = useCallback(
		(): void => setDismissedAt(serverUpdatedAt ?? null),
		[serverUpdatedAt],
	);
	// Reload is Dismiss + refetch: close the prompt immediately on the user's action and pull the
	// latest into the render cache. A genuinely newer, different version re-prompts.
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
