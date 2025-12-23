import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';

import {
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
