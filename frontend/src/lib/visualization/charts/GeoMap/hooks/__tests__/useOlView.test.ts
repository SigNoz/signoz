import { act, renderHook } from 'tests/test-utils';
import { getCenter } from 'ol/extent';
import View from 'ol/View';

import {
	GeoMapPoint,
	GeoMapProjection,
	GeoMapView,
	SubdivisionCountry,
} from '../../types';
import { getViewExtent } from '../../utils/olFeatures';
import { toOlProjection } from '../../utils/olProjections';
import { MAX_ZOOM } from '../../utils/zoom';
import { useOlView } from '../useOlView';
import { createFakeOlMap } from './fakeOlMap';

function setup(view: GeoMapView = 'europe', country?: SubdivisionCountry) {
	const fake = createFakeOlMap();
	const hook = renderHook(
		({ width, projection }: { width: number; projection: GeoMapProjection }) =>
			useOlView(fake.handle, view, projection, country, [], width, 400),
		{ initialProps: { width: 800, projection: 'mercator' } },
	);
	const olView = (): View => fake.handle.map.getView();
	return { ...fake, ...hook, olView };
}

describe('useOlView', () => {
	it('frames the view’s box', () => {
		const { olView } = setup('europe');

		const centre = olView().getCenter() as number[];
		const expected = getCenter(
			getViewExtent('europe', 'mercator', [], undefined),
		);
		expect(centre[0]).toBeCloseTo(expected[0], -2);
		expect(centre[1]).toBeCloseTo(expected[1], -2);
	});

	it('keeps the fitted zoom as the floor and caps zooming in', () => {
		const { olView } = setup();

		const fitted = olView().getZoom() as number;
		expect(olView().getMinZoom()).toBeCloseTo(fitted, 6);
		expect(olView().getMaxZoom()).toBeCloseTo(fitted + Math.log2(MAX_ZOOM), 6);
	});

	it('enables zoom out and reset only once zoomed in', () => {
		const { result, olView } = setup();
		expect(result.current.canZoomOut).toBe(false);
		expect(result.current.canZoomIn).toBe(true);

		act(() => {
			olView().setZoom((olView().getZoom() as number) + 1);
		});

		expect(result.current.canZoomOut).toBe(true);
	});

	it('zooms by one step from the controls', () => {
		const { result, olView } = setup();
		const animate = jest.spyOn(olView(), 'animate');
		const before = olView().getZoom() as number;

		act(() => result.current.zoomIn());

		expect(animate).toHaveBeenCalledWith(
			expect.objectContaining({ zoom: before + Math.log2(1.6) }),
		);
	});

	it('resets to the fitted frame', () => {
		const { result, olView } = setup();
		const fit = jest.spyOn(olView(), 'fit');

		act(() => result.current.reset());

		expect(fit).toHaveBeenCalledWith(
			getViewExtent('europe', 'mercator', [], undefined),
			expect.objectContaining({ duration: expect.any(Number) }),
		);
	});

	it('refits on resize while the user hasn’t moved the map', () => {
		const { setView, updateSize, rerender, olView } = setup();
		const views = setView.mock.calls.length;
		const fit = jest.spyOn(olView(), 'fit');

		rerender({ width: 600, projection: 'mercator' });

		expect(setView.mock.calls).toHaveLength(views);
		expect(updateSize).toHaveBeenCalled();
		expect(fit).toHaveBeenCalled();
	});

	it('keeps the user’s zoom and pan on resize', () => {
		const { rerender, olView } = setup();
		act(() => {
			olView().setZoom((olView().getZoom() as number) + 1);
			olView().setCenter([1e5, 5e6]);
		});
		const zoom = olView().getZoom();
		const center = olView().getCenter();

		rerender({ width: 600, projection: 'mercator' });

		expect(olView().getZoom()).toBeCloseTo(zoom as number, 6);
		expect(olView().getCenter()).toStrictEqual(center);
	});

	it('keeps the user’s zoom when a refetch frames the same box', () => {
		const fake = createFakeOlMap();
		const pointsAt = (lon: number): GeoMapPoint[] => [
			{ id: 'a', lat: 40, lon, value: 1, label: '' },
			{ id: 'b', lat: 50, lon: 20, value: 2, label: '' },
		];
		const { rerender } = renderHook(
			({ points }: { points: GeoMapPoint[] }) =>
				useOlView(fake.handle, 'fit', 'mercator', undefined, [], 800, 400, points),
			{ initialProps: { points: pointsAt(0) } },
		);
		const olView = (): View => fake.handle.map.getView();
		act(() => {
			olView().setZoom((olView().getZoom() as number) + 1);
		});
		const zoom = olView().getZoom();
		const views = fake.setView.mock.calls.length;

		rerender({ points: pointsAt(0) });
		expect(fake.setView.mock.calls).toHaveLength(views);
		expect(olView().getZoom()).toBe(zoom);

		rerender({ points: pointsAt(-10) });
		expect(fake.setView.mock.calls).toHaveLength(views + 1);
	});

	it('refits in the new projection when it changes', () => {
		const { rerender, olView } = setup('world');
		expect(olView().getProjection().getCode()).toBe('EPSG:3857');

		rerender({ width: 800, projection: 'equal_earth' });

		expect(olView().getProjection().getCode()).toBe(
			toOlProjection('equal_earth'),
		);
	});

	it('waits for the panel to have a size', () => {
		const fake = createFakeOlMap();
		renderHook(() =>
			useOlView(fake.handle, 'world', 'mercator', undefined, [], 0, 0),
		);
		expect(fake.setView).not.toHaveBeenCalled();
	});
});
