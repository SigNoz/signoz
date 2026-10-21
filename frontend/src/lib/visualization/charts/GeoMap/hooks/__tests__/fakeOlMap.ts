import type Feature from 'ol/Feature';
import VectorLayer from 'ol/layer/Vector';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import VectorSource from 'ol/source/Vector';
import View from 'ol/View';

import { OlLayers, OlMapHandle } from '../useOlMap';

type Listener = (event: MapBrowserEvent) => void;

export interface FakeOlMap {
	handle: OlMapHandle;
	target: HTMLDivElement;
	/** The feature the next hit test returns. */
	setFeatureUnderPointer: (feature: Feature | null) => void;
	emit: (type: 'pointermove' | 'click', event: Partial<MapBrowserEvent>) => void;
	listenerCount: () => number;
	setView: jest.Mock;
	hitTest: jest.Mock;
	updateSize: jest.Mock;
}

/**
 * Real layers and views, which need no canvas, around a stand-in map: jsdom
 * can't render OpenLayers, so events are emitted by hand and hit testing is stubbed.
 */
export function createFakeOlMap(): FakeOlMap {
	const layers = {
		context: new VectorLayer({ source: new VectorSource() }),
		members: new VectorLayer({ source: new VectorSource() }),
		bubbles: new VectorLayer({ source: new VectorSource() }),
		hover: new VectorLayer({ source: new VectorSource() }),
		labels: new VectorLayer({ source: new VectorSource() }),
	} as OlLayers;
	const target = document.createElement('div');
	const listeners = new Map<string, Set<Listener>>();
	let underPointer: Feature | null = null;
	let view = new View({ center: [0, 0], zoom: 1 });
	const setView = jest.fn((next: View) => {
		view = next;
	});
	const updateSize = jest.fn();
	const hitTest = jest.fn(
		(_pixel: number[], callback: (feature: Feature) => unknown) =>
			underPointer ? callback(underPointer) : undefined,
	);

	const map = {
		on: (type: string, listener: Listener): void => {
			if (!listeners.has(type)) {
				listeners.set(type, new Set());
			}
			listeners.get(type)?.add(listener);
		},
		un: (type: string, listener: Listener): void => {
			listeners.get(type)?.delete(listener);
		},
		forEachFeatureAtPixel: hitTest,
		getTargetElement: (): HTMLDivElement => target,
		getView: (): View => view,
		setView,
		updateSize,
	};

	return {
		handle: { map: map as unknown as OlMapHandle['map'], layers },
		target,
		setFeatureUnderPointer: (feature): void => {
			underPointer = feature;
		},
		emit: (type, event): void => {
			listeners.get(type)?.forEach((listener) =>
				listener({
					pixel: [0, 0],
					dragging: false,
					originalEvent: new MouseEvent('pointermove', { clientX: 10, clientY: 20 }),
					...event,
				} as MapBrowserEvent),
			);
		},
		setView,
		updateSize,
		hitTest,
		listenerCount: (): number =>
			[...listeners.values()].reduce((count, set) => count + set.size, 0),
	};
}
