import { renderHook } from 'tests/test-utils';

import { useUnloadPrompt } from '../useUnloadPrompt';
import { useUnsavedChangesStore } from '../useUnsavedChangesStore';

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

	it('marks the page as having unsaved changes until they are saved or discarded', () => {
		const { rerender } = renderHook(({ enabled }) => useUnloadPrompt(enabled), {
			initialProps: { enabled: true },
		});
		expect(useUnsavedChangesStore.getState().count).toBe(1);

		rerender({ enabled: false });
		expect(useUnsavedChangesStore.getState().count).toBe(0);
	});
});
