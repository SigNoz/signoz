import { renderHook } from 'tests/test-utils';

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
		const onNext = jest.fn() as jest.MockedFunction<() => void>;
		renderHook(() =>
			useArrowKeyNavigation({ enabled: true, onPrev: jest.fn(), onNext }),
		);

		pressArrowDown({ handled: false });

		expect(onNext).toHaveBeenCalledTimes(1);
	});

	it('ignores a key that a focused menu already handled', () => {
		const onNext = jest.fn() as jest.MockedFunction<() => void>;
		renderHook(() =>
			useArrowKeyNavigation({ enabled: true, onPrev: jest.fn(), onNext }),
		);

		pressArrowDown({ handled: true });

		expect(onNext).not.toHaveBeenCalled();
	});

	it('ignores a key pressed inside a menu', () => {
		const onNext = jest.fn() as jest.MockedFunction<() => void>;
		renderHook(() =>
			useArrowKeyNavigation({ enabled: true, onPrev: jest.fn(), onNext }),
		);
		const menu = document.createElement('div');
		menu.setAttribute('role', 'menu');
		const item = document.createElement('div');
		item.setAttribute('role', 'menuitem');
		menu.appendChild(item);
		document.body.appendChild(menu);

		item.dispatchEvent(
			new KeyboardEvent('keydown', {
				key: 'ArrowDown',
				bubbles: true,
				cancelable: true,
			}),
		);

		expect(onNext).not.toHaveBeenCalled();
		menu.remove();
	});

	it('steps even when an ancestor stops the key from bubbling', () => {
		const onNext = jest.fn() as jest.MockedFunction<() => void>;
		renderHook(() =>
			useArrowKeyNavigation({ enabled: true, onPrev: jest.fn(), onNext }),
		);
		const panel = document.createElement('div');
		panel.addEventListener('keydown', (e) => e.stopPropagation());
		document.body.appendChild(panel);

		panel.dispatchEvent(
			new KeyboardEvent('keydown', {
				key: 'ArrowDown',
				bubbles: true,
				cancelable: true,
			}),
		);

		expect(onNext).toHaveBeenCalledTimes(1);
		panel.remove();
	});
});
