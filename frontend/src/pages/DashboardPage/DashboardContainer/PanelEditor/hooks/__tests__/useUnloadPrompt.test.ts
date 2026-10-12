import { renderHook } from '@testing-library/react';

import { useUnloadPrompt } from '../useUnloadPrompt';

function fireBeforeUnload(): Event {
	const event = new Event('beforeunload', { cancelable: true });
	window.dispatchEvent(event);
	return event;
}

describe('useUnloadPrompt', () => {
	it('asks to confirm a reload while enabled', () => {
		renderHook(() => useUnloadPrompt(true));

		expect(fireBeforeUnload().defaultPrevented).toBe(true);
	});

	it('lets the page unload when disabled', () => {
		renderHook(() => useUnloadPrompt(false));

		expect(fireBeforeUnload().defaultPrevented).toBe(false);
	});

	it('stops asking once the edits are saved or discarded', () => {
		const { rerender } = renderHook(({ enabled }) => useUnloadPrompt(enabled), {
			initialProps: { enabled: true },
		});
		rerender({ enabled: false });

		expect(fireBeforeUnload().defaultPrevented).toBe(false);
	});
});
