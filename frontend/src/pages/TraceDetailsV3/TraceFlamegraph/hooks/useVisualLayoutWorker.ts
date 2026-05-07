import { useEffect, useRef, useState } from 'react';
import { FlamegraphSpan } from 'types/api/trace/getTraceFlamegraph';

import { computeVisualLayout, VisualLayout } from '../computeVisualLayout';
import { LayoutWorkerResponse } from '../visualLayoutWorkerTypes';

const EMPTY_LAYOUT: VisualLayout = {
	visualRows: [],
	spanToVisualRow: {},
	connectors: [],
	totalVisualRows: 0,
};

function computeLayoutOrEmpty(spans: FlamegraphSpan[][]): VisualLayout {
	return spans.length ? computeVisualLayout(spans) : EMPTY_LAYOUT;
}

function createLayoutWorker(): Worker {
	return new Worker(new URL('../visualLayout.worker.ts', import.meta.url), {
		type: 'module',
	});
}

export function useVisualLayoutWorker(
	spans: FlamegraphSpan[][],
): { layout: VisualLayout; isComputing: boolean } {
	const [layout, setLayout] = useState<VisualLayout>(EMPTY_LAYOUT);
	const [isComputing, setIsComputing] = useState(false);
	const workerRef = useRef<Worker | null>(null);
	const requestIdRef = useRef(0);
	const fallbackRef = useRef(typeof Worker === 'undefined');

	// Effect: post message to worker when spans change
	useEffect(() => {
		if (fallbackRef.current) {
			setLayout(computeLayoutOrEmpty(spans));
			return;
		}

		if (!workerRef.current) {
			try {
				workerRef.current = createLayoutWorker();
			} catch {
				fallbackRef.current = true;
				setLayout(computeLayoutOrEmpty(spans));
				return;
			}
		}

		if (!spans.length) {
			setLayout(EMPTY_LAYOUT);
			return;
		}

		const currentId = ++requestIdRef.current;
		setIsComputing(true);

		const worker = workerRef.current;

		const onMessage = (e: MessageEvent<LayoutWorkerResponse>): void => {
			if (e.data.requestId !== requestIdRef.current) {
				return;
			}
			if (e.data.type === 'result') {
				setLayout(e.data.layout);
			} else {
				setLayout(computeVisualLayout(spans));
			}
			setIsComputing(false);
		};

		const onError = (): void => {
			if (requestIdRef.current === currentId) {
				setLayout(computeVisualLayout(spans));
				setIsComputing(false);
			}
		};

		worker.addEventListener('message', onMessage);
		worker.addEventListener('error', onError);
		worker.postMessage({ type: 'compute', requestId: currentId, spans });

		return (): void => {
			worker.removeEventListener('message', onMessage);
			worker.removeEventListener('error', onError);
		};
	}, [spans]);

	// Cleanup worker on unmount
	useEffect(
		() => (): void => {
			workerRef.current?.terminate();
		},
		[],
	);

	return { layout, isComputing };
}
