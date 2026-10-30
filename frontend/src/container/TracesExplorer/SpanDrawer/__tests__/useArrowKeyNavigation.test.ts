import { renderHook } from '@testing-library/react';

import { useArrowKeyNavigation } from '../useArrowKeyNavigation';

const pressArrowDown = ({ handled }: { handled: boolean }): void => {
	const event = new KeyboardEvent('keydown', {
		key: 'ArrowDown',
		bubbles: true,
		cancelable: true,
	});
	if (handled) {
		event.preventDefault();
	}
	document.body.dispatchEvent(event);
};

describe('useArrowKeyNavigation', () => {
	it('steps to the next span on ArrowDown', () => {
		const onNext = jest.fn();
		renderHook(() =>
			useArrowKeyNavigation({ enabled: true, onPrev: jest.fn(), onNext }),
		);

		pressArrowDown({ handled: false });

		expect(onNext).toHaveBeenCalledTimes(1);
	});

	it('ignores a key that a focused menu already handled', () => {
		const onNext = jest.fn();
		renderHook(() =>
			useArrowKeyNavigation({ enabled: true, onPrev: jest.fn(), onNext }),
		);

		pressArrowDown({ handled: true });

		expect(onNext).not.toHaveBeenCalled();
	});
});
