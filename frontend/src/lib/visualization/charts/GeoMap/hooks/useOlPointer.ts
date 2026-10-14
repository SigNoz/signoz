import { useEffect } from 'react';
import type MapBrowserEvent from 'ol/MapBrowserEvent';

import { OlMapHandle } from './useOlMap';

/**
 * Hover and click through OpenLayers' hit detection. OpenLayers only fires
 * `click` when the pointer didn't move, so a pan never selects.
 */
export function useOlPointer(
	handle: OlMapHandle | null,
	onHover: (code: string | null, clientX: number, clientY: number) => void,
	onSelect: (code: string, clientX: number, clientY: number) => void,
): void {
	useEffect(() => {
		if (!handle) {
			return undefined;
		}
		const { map, layers } = handle;
		const codeAt = (event: MapBrowserEvent): string | null => {
			const feature = map.forEachFeatureAtPixel(event.pixel, (hit) => hit, {
				layerFilter: (layer) =>
					layer === layers.members || layer === layers.bubbles,
				hitTolerance: 2,
			});
			return (feature?.get('code') as string | null | undefined) ?? null;
		};
		const target = map.getTargetElement();
		if (!target) {
			return undefined;
		}
		const handleMove = (event: MapBrowserEvent): void => {
			const code = event.dragging ? null : codeAt(event);
			const { clientX, clientY } = event.originalEvent as PointerEvent;
			target.style.cursor = code ? 'pointer' : '';
			onHover(code, clientX, clientY);
		};
		const handleClick = (event: MapBrowserEvent): void => {
			const code = codeAt(event);
			const { clientX, clientY } = event.originalEvent as PointerEvent;
			if (code) {
				onSelect(code, clientX, clientY);
			}
		};
		const handleLeave = (): void => onHover(null, 0, 0);
		map.on('pointermove', handleMove);
		map.on('click', handleClick);
		target.addEventListener('mouseleave', handleLeave);
		return (): void => {
			map.un('pointermove', handleMove);
			map.un('click', handleClick);
			target.removeEventListener('mouseleave', handleLeave);
		};
	}, [handle, onHover, onSelect]);
}
