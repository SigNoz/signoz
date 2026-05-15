import type { RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AutoPageSizeConfig } from './types';

const DEFAULT_ROW_HEIGHT = 36;
const DEFAULT_HEADER_HEIGHT = 36;
const DEFAULT_PAGINATION_HEIGHT = 62;
const MIN_PAGE_SIZE = 5;
const MAX_PAGE_SIZE = 100;

export type UseCalculatedPageSizeResult = {
	containerRef: RefObject<HTMLDivElement>;
	calculatedPageSize: number | null;
};

export function useCalculatedPageSize(
	config?: AutoPageSizeConfig,
): UseCalculatedPageSizeResult {
	const containerRef = useRef<HTMLDivElement>(null);
	const [calculatedPageSize, setCalculatedPageSize] = useState<number | null>(
		null,
	);

	const rowHeight = config?.rowHeight ?? DEFAULT_ROW_HEIGHT;
	const headerHeight = config?.headerHeight ?? DEFAULT_HEADER_HEIGHT;
	const paginationHeight = config?.paginationHeight ?? DEFAULT_PAGINATION_HEIGHT;
	const minPageSize = config?.minPageSize ?? MIN_PAGE_SIZE;
	const maxPageSize = config?.maxPageSize ?? MAX_PAGE_SIZE;

	const calculatePageSize = useCallback(
		(containerHeight: number): number => {
			const availableHeight = containerHeight - headerHeight - paginationHeight;
			const rawPageSize = Math.floor(availableHeight / rowHeight);
			return Math.min(maxPageSize, Math.max(minPageSize, rawPageSize));
		},
		[rowHeight, headerHeight, paginationHeight, minPageSize, maxPageSize],
	);

	useEffect(() => {
		if (!containerRef.current) {
			return;
		}

		const container = containerRef.current;

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];

			if (!entry) {
				return;
			}

			const { height } = entry.contentRect;
			if (height > 0) {
				const newPageSize = calculatePageSize(height);
				setCalculatedPageSize((prev) =>
					prev !== newPageSize ? newPageSize : prev,
				);
			}
		});

		observer.observe(container);

		const { height } = container.getBoundingClientRect();
		if (height > 0) {
			setCalculatedPageSize(calculatePageSize(height));
		}

		return (): void => {
			observer.disconnect();
		};
	}, [calculatePageSize]);

	return { containerRef, calculatedPageSize };
}
