import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_COPIED_RESET_MS = 2000;

export interface UseCopyToClipboardOptions {
	/** How long (ms) to keep "copied" state before resetting. Default 2000. */
	copiedResetMs?: number;
}

export type ID = number | string | null;

export interface UseCopyToClipboardReturn {
	/** Copy text to clipboard. Pass an optional id to track which item was copied (e.g. seriesIndex). */
	copyToClipboard: (text: string, id?: ID) => void;
	/** True when something was just copied and still within the reset threshold. */
	isCopied: boolean;
	/** The id passed to the last successful copy, or null after reset. Use to show "copied" state for a specific item (e.g. copiedId === item.seriesIndex). */
	id: ID;
}

export function useCopyToClipboard(
	options: UseCopyToClipboardOptions = {},
): UseCopyToClipboardReturn {
	const { copiedResetMs = DEFAULT_COPIED_RESET_MS } = options;
	const [state, setState] = useState<{ isCopied: boolean; id: ID }>({
		isCopied: false,
		id: null,
	});
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		return (): void => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
				timeoutRef.current = null;
			}
		};
	}, []);

	const copyToClipboard = useCallback(
		(text: string, id?: ID): void => {
			navigator.clipboard.writeText(text).then(() => {
				if (timeoutRef.current) {
					clearTimeout(timeoutRef.current);
				}
				setState({ isCopied: true, id: id ?? null });
				timeoutRef.current = setTimeout(() => {
					setState({ isCopied: false, id: null });
					timeoutRef.current = null;
				}, copiedResetMs);
			});
		},
		[copiedResetMs],
	);

	return {
		copyToClipboard,
		isCopied: state.isCopied,
		id: state.id,
	};
}
