import { useEffect, useRef, useState } from 'react';
import type WebGLVectorLayer from 'ol/layer/WebGLVector';
import VectorSource from 'ol/source/Vector';

import { supportsWebGL } from '../utils/webgl';
import { OlMapHandle } from './useOlMap';

export type PointsLayerStatus = 'idle' | 'loading' | 'ready' | 'unsupported';

export interface OlPointsLayer {
	layer: WebGLVectorLayer<VectorSource> | null;
	/** `unsupported` means points fall back to the canvas bubbles layer. */
	status: PointsLayerStatus;
}

/**
 * The GPU points layer, loaded only when a map first shows points: its WebGL
 * code is a separate chunk, so region and bubble maps never download it.
 */
export function useOlPointsLayer(
	handle: OlMapHandle | null,
	active: boolean,
): OlPointsLayer {
	const [layer, setLayer] = useState<WebGLVectorLayer<VectorSource> | null>(
		null,
	);
	const [status, setStatus] = useState<PointsLayerStatus>('idle');
	// The map the layer was requested for, so a re-render doesn't request it twice.
	const requestedFor = useRef<OlMapHandle | null>(null);

	useEffect(() => {
		if (!handle || !active || requestedFor.current === handle) {
			return undefined;
		}
		requestedFor.current = handle;
		if (!supportsWebGL()) {
			setStatus('unsupported');
			return undefined;
		}
		setStatus('loading');
		let settled = false;
		let cancelled = false;
		const load = async (): Promise<void> => {
			try {
				const { default: WebGLVector } = await import('ol/layer/WebGLVector');
				settled = true;
				if (cancelled) {
					return;
				}
				const created = new WebGLVector({
					source: new VectorSource({ wrapX: false }),
					style: { 'circle-radius': 0 },
				});
				const layers = handle.map.getLayers();
				// Above the bubbles, under the hover ring and labels.
				layers.insertAt(
					layers.getArray().indexOf(handle.layers.bubbles) + 1,
					created,
				);
				setLayer(created);
				setStatus('ready');
			} catch {
				settled = true;
				if (!cancelled) {
					setStatus('unsupported');
				}
			}
		};
		void load();
		return (): void => {
			// Only an unfinished load is dropped; it is requested again next time.
			if (!settled) {
				cancelled = true;
				requestedFor.current = null;
				setStatus('idle');
			}
		};
	}, [handle, active]);

	useEffect(
		() => (): void => {
			if (layer && handle) {
				handle.map.removeLayer(layer);
				layer.dispose();
			}
		},
		[handle, layer],
	);

	return { layer, status };
}
