import { renderHook } from '@testing-library/react';
import Feature from 'ol/Feature';

import { useOlPointer } from '../useOlPointer';
import { createFakeOlMap } from './fakeOlMap';

describe('useOlPointer', () => {
	const germany = new Feature({ code: 'DE' });

	function setup(): ReturnType<typeof createFakeOlMap> & {
		onHover: jest.Mock;
		onSelect: jest.Mock;
		unmount: () => void;
	} {
		const fake = createFakeOlMap();
		const onHover = jest.fn();
		const onSelect = jest.fn();
		const { unmount } = renderHook(() =>
			useOlPointer(fake.handle, onHover, onSelect),
		);
		return { ...fake, onHover, onSelect, unmount };
	}

	it('reports the shape under the pointer, with a pointer cursor', () => {
		const { setFeatureUnderPointer, emit, onHover, target } = setup();
		setFeatureUnderPointer(germany);

		emit('pointermove', {});

		expect(onHover).toHaveBeenLastCalledWith('DE', 10, 20);
		expect(target.style.cursor).toBe('pointer');
	});

	it('only hit-tests the member and bubble layers', () => {
		const { handle, hitTest, setFeatureUnderPointer, emit } = setup();
		setFeatureUnderPointer(germany);

		emit('pointermove', {});

		const [, , options] = hitTest.mock.calls[0];
		const { layers } = handle;
		expect(options?.layerFilter?.(layers.members)).toBe(true);
		expect(options?.layerFilter?.(layers.bubbles)).toBe(true);
		expect(options?.layerFilter?.(layers.context)).toBe(false);
	});

	it('reports nothing while the map is being dragged', () => {
		const { setFeatureUnderPointer, emit, onHover } = setup();
		setFeatureUnderPointer(germany);

		emit('pointermove', { dragging: true });

		expect(onHover).toHaveBeenLastCalledWith(null, 10, 20);
	});

	it('clears the hover when the pointer leaves the map', () => {
		const { target, onHover } = setup();

		target.dispatchEvent(new MouseEvent('mouseleave'));

		expect(onHover).toHaveBeenLastCalledWith(null, 0, 0);
	});

	it('selects the clicked shape', () => {
		const { setFeatureUnderPointer, emit, onSelect } = setup();
		setFeatureUnderPointer(germany);

		emit('click', {});

		expect(onSelect).toHaveBeenCalledWith('DE', 10, 20);
	});

	it('ignores clicks on empty map', () => {
		const { emit, onSelect } = setup();

		emit('click', {});

		expect(onSelect).not.toHaveBeenCalled();
	});

	it('stops listening when unmounted', () => {
		const { unmount, listenerCount } = setup();
		expect(listenerCount()).toBe(2);

		unmount();

		expect(listenerCount()).toBe(0);
	});
});
