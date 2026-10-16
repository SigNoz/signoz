import { act, renderHook } from '@testing-library/react';
import { getCenter } from 'ol/extent';
import View from 'ol/View';

import { GeoMapProjection, GeoMapView, SubdivisionCountry } from '../../types';
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

	it('refits when the panel is resized', () => {
		const { setView, updateSize, rerender } = setup();
		const views = setView.mock.calls.length;

		rerender({ width: 600, projection: 'mercator' });

		expect(setView.mock.calls).toHaveLength(views + 1);
		expect(updateSize).toHaveBeenCalled();
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
