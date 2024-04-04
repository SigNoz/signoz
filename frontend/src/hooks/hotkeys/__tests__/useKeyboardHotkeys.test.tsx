import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
	KeyboardHotkeysProvider,
	useKeyboardHotkeys,
} from '../useKeyboardHotkeys';

function TestComponentWithRegister({
	handleShortcut,
}: {
	handleShortcut: () => void;
}): JSX.Element {
	const { registerShortcut } = useKeyboardHotkeys();

	registerShortcut('a', handleShortcut);

	return (
		<div>
			<span>Test Component</span>
		</div>
	);
}
function TestComponentWithDeRegister({
	handleShortcut,
}: {
	handleShortcut: () => void;
}): JSX.Element {
	const { registerShortcut, deregisterShortcut } = useKeyboardHotkeys();

	registerShortcut('b', handleShortcut);

	// Deregister the shortcut before triggering it
	deregisterShortcut('b');

	return (
		<div>
			<span>Test Component</span>
		</div>
	);
}

describe('KeyboardHotkeysProvider', () => {
	it('registers and triggers shortcuts correctly', async () => {
		const handleShortcut = jest.fn();

		render(
			<KeyboardHotkeysProvider>
				<TestComponentWithRegister handleShortcut={handleShortcut} />
			</KeyboardHotkeysProvider>,
		);

		// Trigger the registered shortcut
		await userEvent.keyboard('a');

		// Assert that the handleShortcut function has been called
		expect(handleShortcut).toHaveBeenCalled();
	});

	it('deregisters shortcuts correctly', () => {
		const handleShortcut = jest.fn();

		render(
			<KeyboardHotkeysProvider>
				<TestComponentWithDeRegister handleShortcut={handleShortcut} />
			</KeyboardHotkeysProvider>,
		);

		// Try to trigger the deregistered shortcut
		userEvent.keyboard('b');

		// Assert that the handleShortcut function has NOT been called
		expect(handleShortcut).not.toHaveBeenCalled();
	});
});
