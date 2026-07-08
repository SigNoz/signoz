import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageKey from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import debounce from 'lodash-es/debounce';
import { useCallback, useMemo, useRef } from 'react';

const PERSIST_DEBOUNCE_MS = 150;

interface UsePanelWidthArgs {
	/** Per-page localStorage key the width is persisted under. */
	storageKey: LOCALSTORAGE;
	/** Canonical default width, used when nothing is persisted. */
	defaultWidth: number;
	minWidth: number;
	maxWidth: number;
}

interface UsePanelWidthReturn {
	/** Width to start from: the persisted value (clamped) or the default. */
	initialWidth: number;
	/** Clamp and persist a width. Debounced to avoid a write per mousemove. */
	persistWidth: (width: number) => void;
}

const clamp = (value: number, min: number, max: number): number =>
	Math.min(max, Math.max(min, value));

/**
 * Per-page localStorage persistence for a resizable panel width. Mirrors the
 * getLocalStorageKey/setLocalStorageKey idiom used for the trace span-details
 * panel position. Pairs with ResizableBox: feed initialWidth into its
 * initialWidth prop and persistWidth into its onResize.
 */
function usePanelWidth({
	storageKey,
	defaultWidth,
	minWidth,
	maxWidth,
}: UsePanelWidthArgs): UsePanelWidthReturn {
	// Read once on mount. Kept in a ref so a re-render doesn't re-read storage.
	const initialWidthRef = useRef<number | null>(null);
	if (initialWidthRef.current === null) {
		const stored = getLocalStorageKey(storageKey);
		const parsed = stored !== null && stored !== '' ? Number(stored) : NaN;
		initialWidthRef.current = Number.isFinite(parsed)
			? clamp(parsed, minWidth, maxWidth)
			: defaultWidth;
	}

	const debouncedWrite = useMemo(
		() =>
			debounce((width: number): void => {
				setLocalStorageKey(storageKey, String(width));
			}, PERSIST_DEBOUNCE_MS),
		[storageKey],
	);

	const persistWidth = useCallback(
		(width: number): void => {
			debouncedWrite(clamp(width, minWidth, maxWidth));
		},
		[debouncedWrite, minWidth, maxWidth],
	);

	return { initialWidth: initialWidthRef.current, persistWidth };
}

export default usePanelWidth;
