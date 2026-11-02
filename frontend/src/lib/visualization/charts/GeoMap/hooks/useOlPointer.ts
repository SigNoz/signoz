import { useEffect } from 'react';
import type MapBrowserEvent from 'ol/MapBrowserEvent';

import type BaseLayer from 'ol/layer/Base';

import { OlMapHandle } from './useOlMap';

/**
 * Hover and click through OpenLayers' hit detection. OpenLayers only fires
 * `click` when the pointer didn't move, so a pan never selects. It fires on
 * `pointerup`, before the DOM `click` that closes any open popover, so the
 * selection waits for that DOM `click`; otherwise the drilldown menu it opens
 * would close straight away.
 */
export function useOlPointer(
	handle: OlMapHandle | null,
	onHover: (code: string | null, clientX: number, clientY: number) => void,
	onSelect: (code: string, clientX: number, clientY: number) => void,
	/** The lazily loaded GPU points layer, once it exists. */
	pointsLayer: BaseLayer | null = null,
): void {
	useEffect(() => {
		if (!handle) {
			return undefined;
		}
		const { map, layers } = handle;
		const codeAt = (event: MapBrowserEvent): string | null => {
			const feature = map.forEachFeatureAtPixel(event.pixel, (hit) => hit, {
				layerFilter: (layer) =>
					layer === layers.members ||
					layer === layers.bubbles ||
					layer === pointsLayer,
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
		let clickedCode: string | null = null;
		const handleClick = (event: MapBrowserEvent): void => {
			clickedCode = codeAt(event);
		};
		const handleDomClick = (event: MouseEvent): void => {
			const code = clickedCode;
			clickedCode = null;
			if (code) {
				onSelect(code, event.clientX, event.clientY);
			}
		};
		const handleLeave = (): void => onHover(null, 0, 0);
		map.on('pointermove', handleMove);
		map.on('click', handleClick);
		target.addEventListener('click', handleDomClick);
		target.addEventListener('mouseleave', handleLeave);
		return (): void => {
			map.un('pointermove', handleMove);
			map.un('click', handleClick);
			target.removeEventListener('click', handleDomClick);
			target.removeEventListener('mouseleave', handleLeave);
		};
	}, [handle, onHover, onSelect, pointsLayer]);
}
