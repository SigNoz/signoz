import { RefObject, useEffect, useRef } from 'react';
import type { TableVirtuosoHandle } from 'react-virtuoso';

export function useResetScroll(
	scrollRef: RefObject<TableVirtuosoHandle | null>,
	resetKey: string | undefined,
): void {
	const prevKeyRef = useRef(resetKey);

	useEffect(() => {
		if (prevKeyRef.current !== resetKey) {
			prevKeyRef.current = resetKey;
			scrollRef.current?.scrollTo({
				left: 0,
			});
		}
	}, [resetKey, scrollRef]);
}
