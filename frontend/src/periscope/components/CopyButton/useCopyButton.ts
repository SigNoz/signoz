import { useCallback, useEffect, useRef, useState } from 'react';
import { useCopyToClipboard } from 'react-use';

import { COPIED_RESET_MS } from './constants';

export interface UseCopyButtonReturn {
	copyToClipboard: (text: string) => void;
	isCopied: boolean;
}

export function useCopyButton(): UseCopyButtonReturn {
	const [, copy] = useCopyToClipboard();
	const [isCopied, setIsCopied] = useState(false);
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
		(text: string): void => {
			copy(text);
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
			setIsCopied(true);
			timeoutRef.current = setTimeout(() => {
				setIsCopied(false);
				timeoutRef.current = null;
			}, COPIED_RESET_MS);
		},
		[copy],
	);

	return {
		copyToClipboard,
		isCopied,
	};
}
