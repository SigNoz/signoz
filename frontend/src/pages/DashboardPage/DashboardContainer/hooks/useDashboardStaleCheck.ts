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
 * Prompts when another tab/user changed the open dashboard. The page's own query is frozen
 * (`staleTime: Infinity`), so we re-probe the server on tab/app return (not on first load) and
 * prompt only when it's strictly newer AND its content (spec, tags, or lock state) differs from
 * what we're viewing — so our own edits, which advance the render cache, don't trip it.
 * In-flight mutations are skipped.
 */
export function useDashboardStaleCheck(
	dashboard: DashboardtypesGettableDashboardV2DTO,
	refetch: () => void,
): UseDashboardStaleCheck {
	const {
		id: dashboardId,
		updatedAt: loadedUpdatedAt,
		spec: loadedSpec,
		tags: loadedTags,
		locked: loadedLocked,
	} = dashboard;
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
		// `visibilitychange` catches tab switches; `focus` catches app/window switches.
		document.addEventListener('visibilitychange', probe);
		window.addEventListener('focus', probe);
		return (): void => {
			document.removeEventListener('visibilitychange', probe);
			window.removeEventListener('focus', probe);
		};
	}, [dashboardId]);

	const serverUpdatedAt = server?.updatedAt;

	// Content the viewer cares about: panels/layout/variables (spec), tags, and lock state.
	// Deep, order-independent so an optimistic patch's key reordering isn't read as a change.
	const contentDiffers = useMemo(
		() =>
			!!server &&
			(!isEqual(server.spec, loadedSpec) ||
				!isEqual(server.tags, loadedTags) ||
				server.locked !== loadedLocked),
		[server, loadedSpec, loadedTags, loadedLocked],
	);

	const changed =
		!isMutating &&
		!!serverUpdatedAt &&
		!!loadedUpdatedAt &&
		new Date(serverUpdatedAt).getTime() > new Date(loadedUpdatedAt).getTime() &&
		contentDiffers;

	const dismiss = useCallback(
		(): void => setDismissedAt(serverUpdatedAt ?? null),
		[serverUpdatedAt],
	);
	// Dismiss + refetch: close on click and pull the latest; a newer, different version re-prompts.
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
