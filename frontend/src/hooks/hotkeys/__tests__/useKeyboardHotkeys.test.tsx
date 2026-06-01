import { useEffect } from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
	HOLD_FIRE_DELAY_MS,
	KeyboardHotkeysProvider,
	useKeyboardHotkeys,
} from '../useKeyboardHotkeys';

jest.mock('../../../providers/cmdKProvider', () => ({
	useCmdK: (): { open: boolean } => ({
		open: false,
	}),
}));

function TestComponentWithRegister({
	handleShortcut,
}: {
	handleShortcut: () => void;
}): JSX.Element {
	const { registerShortcut } = useKeyboardHotkeys();

	useEffect(() => {
		registerShortcut('a', handleShortcut);
	}, [registerShortcut, handleShortcut]);

	return <span>Test Component</span>;
}

function TestComponentWithDeRegister({
	handleShortcut,
}: {
	handleShortcut: () => void;
}): JSX.Element {
	const { registerShortcut, deregisterShortcut } = useKeyboardHotkeys();

	useEffect(() => {
		registerShortcut('b', handleShortcut);
		deregisterShortcut('b');
	}, [registerShortcut, deregisterShortcut, handleShortcut]);

	return <span>Test Component</span>;
}

describe('KeyboardHotkeysProvider', () => {
	it('registers and triggers shortcuts correctly', async () => {
		const handleShortcut = jest.fn();
		const user = userEvent.setup();

		render(
			<KeyboardHotkeysProvider>
				<TestComponentWithRegister handleShortcut={handleShortcut} />
			</KeyboardHotkeysProvider>,
		);

		// fires on keyup
		await user.keyboard('{a}');

		expect(handleShortcut).toHaveBeenCalledTimes(1);
	});

	it('does not trigger deregistered shortcuts', async () => {
		const handleShortcut = jest.fn();
		const user = userEvent.setup();

		render(
			<KeyboardHotkeysProvider>
				<TestComponentWithDeRegister handleShortcut={handleShortcut} />
			</KeyboardHotkeysProvider>,
		);

		await user.keyboard('{b}');

		expect(handleShortcut).not.toHaveBeenCalled();
	});
});

// ---- Hold-fire & combo-extension timing tests ----
/**
 * Test component that registers two shortcuts that share a prefix:
 *   shift+m  → handleParent
 *   shift+m+e → handleChild
 * This mirrors the real metrics shortcuts (Metrics Summary vs Metrics Explorer).
 */
function TestComponentWithChords({
	handleParent,
	handleChild,
}: {
	handleParent: () => void;
	handleChild: () => void;
}): JSX.Element {
	const { registerShortcut } = useKeyboardHotkeys();

	useEffect(() => {
		registerShortcut('shift+m', handleParent);
		registerShortcut('shift+m+e', handleChild);
	}, [registerShortcut, handleParent, handleChild]);

	return <span>Chord Test</span>;
}

/** Dispatch a keydown event from document.body so event.target is an HTMLElement (has .closest) */
function fireKeyDown(key: string, opts: Partial<KeyboardEventInit> = {}): void {
	document.body.dispatchEvent(
		new KeyboardEvent('keydown', { key, bubbles: true, ...opts }),
	);
}

/** Dispatch a keyup event from document.body */
function fireKeyUp(key: string, opts: Partial<KeyboardEventInit> = {}): void {
	document.body.dispatchEvent(
		new KeyboardEvent('keyup', { key, bubbles: true, ...opts }),
	);
}

describe('Hold-fire timing behaviour', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	/**
	 * Scenario 1: Quick tap — keys pressed and released immediately (before timeout)
	 *
	 * Timeline: Shift↓ → M↓ → M↑ → Shift↑  (all within < 200ms)
	 * Expected: shift+m fires on keyup, NOT via hold timer
	 */
	it('fires on keyup when keys are released before hold timeout', () => {
		const handleParent = jest.fn();
		const handleChild = jest.fn();

		render(
			<KeyboardHotkeysProvider>
				<TestComponentWithChords
					handleParent={handleParent}
					handleChild={handleChild}
				/>
			</KeyboardHotkeysProvider>,
		);

		fireKeyDown('Shift', { shiftKey: true });
		fireKeyDown('m', { shiftKey: true });

		expect(handleParent).not.toHaveBeenCalled();

		fireKeyUp('m', { shiftKey: true });
		fireKeyUp('Shift');

		expect(handleParent).toHaveBeenCalledTimes(1);
		expect(handleChild).not.toHaveBeenCalled();

		jest.advanceTimersByTime(HOLD_FIRE_DELAY_MS + 50);
		expect(handleParent).toHaveBeenCalledTimes(1);
	});

	/**
	 * Scenario 2: Hold — keys pressed and NOT released; fires via hold timer
	 *
	 * Timeline: Shift↓ → M↓ → ... 200ms passes ... → action fires
	 * Expected: shift+m fires after HOLD_FIRE_DELAY_MS without waiting for keyup
	 */
	it('fires via hold timer when keys are held beyond timeout', () => {
		const handleParent = jest.fn();
		const handleChild = jest.fn();

		render(
			<KeyboardHotkeysProvider>
				<TestComponentWithChords
					handleParent={handleParent}
					handleChild={handleChild}
				/>
			</KeyboardHotkeysProvider>,
		);

		fireKeyDown('Shift', { shiftKey: true });
		fireKeyDown('m', { shiftKey: true });

		jest.advanceTimersByTime(HOLD_FIRE_DELAY_MS - 10);
		expect(handleParent).not.toHaveBeenCalled();

		jest.advanceTimersByTime(20);
		expect(handleParent).toHaveBeenCalledTimes(1);

		fireKeyUp('m', { shiftKey: true });
		fireKeyUp('Shift');
		expect(handleParent).toHaveBeenCalledTimes(1);
		expect(handleChild).not.toHaveBeenCalled();
	});

	/**
	 * Scenario 3: Extended combo with quick release — shift+m extended to shift+m+e,
	 *             then keys released immediately (before timeout)
	 *
	 * Timeline: Shift↓ → M↓ → E↓ → E↑ → M↑ → Shift↑  (all within < 200ms)
	 * Expected: shift+m does NOT fire; shift+m+e fires on keyup
	 */
	it('does not fire parent when combo is extended; fires child on keyup', () => {
		const handleParent = jest.fn();
		const handleChild = jest.fn();

		render(
			<KeyboardHotkeysProvider>
				<TestComponentWithChords
					handleParent={handleParent}
					handleChild={handleChild}
				/>
			</KeyboardHotkeysProvider>,
		);

		fireKeyDown('Shift', { shiftKey: true });
		fireKeyDown('m', { shiftKey: true });

		fireKeyDown('e', { shiftKey: true });

		expect(handleParent).not.toHaveBeenCalled();

		fireKeyUp('e', { shiftKey: true });
		fireKeyUp('m', { shiftKey: true });
		fireKeyUp('Shift');

		expect(handleParent).not.toHaveBeenCalled();
		expect(handleChild).toHaveBeenCalledTimes(1);

		jest.advanceTimersByTime(HOLD_FIRE_DELAY_MS + 50);
		expect(handleChild).toHaveBeenCalledTimes(1);
	});

	/**
	 * Scenario 4: Extended combo with hold — shift+m extended to shift+m+e,
	 *             then keys held past timeout
	 *
	 * Timeline: Shift↓ → M↓ → E↓ → ... 200ms passes ... → shift+m+e fires
	 * Expected: shift+m does NOT fire; shift+m+e fires via hold timer
	 */
	it('does not fire parent when combo is extended; fires child via hold timer', () => {
		const handleParent = jest.fn();
		const handleChild = jest.fn();

		render(
			<KeyboardHotkeysProvider>
				<TestComponentWithChords
					handleParent={handleParent}
					handleChild={handleChild}
				/>
			</KeyboardHotkeysProvider>,
		);

		fireKeyDown('Shift', { shiftKey: true });
		fireKeyDown('m', { shiftKey: true });

		fireKeyDown('e', { shiftKey: true });

		jest.advanceTimersByTime(HOLD_FIRE_DELAY_MS - 10);
		expect(handleParent).not.toHaveBeenCalled();
		expect(handleChild).not.toHaveBeenCalled();

		jest.advanceTimersByTime(20);
		expect(handleParent).not.toHaveBeenCalled();
		expect(handleChild).toHaveBeenCalledTimes(1);

		fireKeyUp('e', { shiftKey: true });
		fireKeyUp('m', { shiftKey: true });
		fireKeyUp('Shift');
		expect(handleParent).not.toHaveBeenCalled();
		expect(handleChild).toHaveBeenCalledTimes(1);
	});
});
