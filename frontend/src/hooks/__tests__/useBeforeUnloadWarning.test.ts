import { renderHook } from '@testing-library/react';

import useBeforeUnloadWarning from '../useBeforeUnloadWarning';

const dispatchBeforeUnload = (): Event => {
	const event = new Event('beforeunload', { cancelable: true });
	window.dispatchEvent(event);
	return event;
};

describe('useBeforeUnloadWarning', () => {
	it('prevents unload while enabled', () => {
		renderHook(() => useBeforeUnloadWarning(true));

		expect(dispatchBeforeUnload().defaultPrevented).toBe(true);
	});

	it('does not prevent unload while disabled', () => {
		renderHook(() => useBeforeUnloadWarning(false));

		expect(dispatchBeforeUnload().defaultPrevented).toBe(false);
	});

	it('tracks enabled changes and cleans up on unmount', () => {
		const { rerender, unmount } = renderHook(
			({ enabled }) => useBeforeUnloadWarning(enabled),
			{ initialProps: { enabled: false } },
		);

		expect(dispatchBeforeUnload().defaultPrevented).toBe(false);

		rerender({ enabled: true });
		expect(dispatchBeforeUnload().defaultPrevented).toBe(true);

		unmount();
		expect(dispatchBeforeUnload().defaultPrevented).toBe(false);
	});
});
