import { useCallback } from 'react';

import { useIsTextSelected } from './useIsTextSelected';

interface UseTableRowClickOptions<T> {
	getUrl: (item: T) => string | null;
	onNavigate: (url: string, options?: { newTab?: boolean }) => void;
	onBeforeNavigate?: (item: T) => void;
}

interface UseTableRowClickReturn<T> {
	handleRowClick: (item: T) => void;
	handleRowClickNewTab: (item: T) => void;
}

/**
 * Hook for handling table row clicks with text selection check
 * Prevents navigation when user is selecting text
 */
export function useTableRowClick<T>({
	getUrl,
	onNavigate,
	onBeforeNavigate,
}: UseTableRowClickOptions<T>): UseTableRowClickReturn<T> {
	const isTextSelected = useIsTextSelected();

	const handleRowClick = useCallback(
		(item: T): void => {
			if (isTextSelected()) {
				return;
			}

			const url = getUrl(item);
			if (!url) {
				return;
			}

			onBeforeNavigate?.(item);
			onNavigate(url);
		},
		[isTextSelected, getUrl, onNavigate, onBeforeNavigate],
	);

	const handleRowClickNewTab = useCallback(
		(item: T): void => {
			if (isTextSelected()) {
				return;
			}

			const url = getUrl(item);
			if (!url) {
				return;
			}

			onBeforeNavigate?.(item);
			onNavigate(url, { newTab: true });
		},
		[isTextSelected, getUrl, onNavigate, onBeforeNavigate],
	);

	return {
		handleRowClick,
		handleRowClickNewTab,
	};
}
