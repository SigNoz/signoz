import { RefObject, useEffect, useState } from 'react';
import OlMap from 'ol/Map';
import View from 'ol/View';
import {
	defaults as defaultInteractions,
	MouseWheelZoom,
} from 'ol/interaction';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';

export interface OlLayers {
	context: VectorLayer<VectorSource>;
	members: VectorLayer<VectorSource>;
	bubbles: VectorLayer<VectorSource>;
	hover: VectorLayer<VectorSource>;
	/** Shape names; decluttered, and never hit-tested. */
	labels: VectorLayer<VectorSource>;
}

export interface OlMapHandle {
	map: OlMap;
	layers: OlLayers;
}

/**
 * One map per mount; features drawn once, not repeated across world copies.
 * Wheel zoom needs Ctrl/⌘ (trackpad pinch sends ctrlKey) so a
 * plain scroll still scrolls the dashboard; rotation is off.
 */
export function useOlMap(
	target: RefObject<HTMLDivElement>,
): OlMapHandle | null {
	const [handle, setHandle] = useState<OlMapHandle | null>(null);

	useEffect(() => {
		if (!target.current) {
			return undefined;
		}
		const layers: OlLayers = {
			context: new VectorLayer({
				source: new VectorSource({ wrapX: false }),
				opacity: 0.5,
			}),
			members: new VectorLayer({ source: new VectorSource({ wrapX: false }) }),
			bubbles: new VectorLayer({ source: new VectorSource({ wrapX: false }) }),
			hover: new VectorLayer({ source: new VectorSource({ wrapX: false }) }),
			labels: new VectorLayer({
				source: new VectorSource({ wrapX: false }),
				declutter: true,
			}),
		};
		const map = new OlMap({
			target: target.current,
			layers: [
				layers.context,
				layers.members,
				layers.bubbles,
				layers.hover,
				layers.labels,
			],
			controls: [],
			interactions: defaultInteractions({
				mouseWheelZoom: false,
				doubleClickZoom: false,
				altShiftDragRotate: false,
				pinchRotate: false,
			}).extend([
				new MouseWheelZoom({
					condition: (event): boolean => {
						const wheel = event.originalEvent as WheelEvent;
						return wheel.ctrlKey || wheel.metaKey;
					},
				}),
			]),
			view: new View({ center: [0, 0], zoom: 1 }),
		});
		setHandle({ map, layers });
		return (): void => {
			map.setTarget(undefined);
			setHandle(null);
		};
	}, [target]);

	return handle;
}
