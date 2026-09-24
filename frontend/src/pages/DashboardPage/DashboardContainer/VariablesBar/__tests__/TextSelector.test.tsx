import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { VariableSelection } from '../selectionTypes';
import TextSelector from '../components/selectors/TextSelector';

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

function renderSelector(
	selection: VariableSelection,
	onChange = jest.fn(),
): { rerender: (selection: VariableSelection) => void; onChange: jest.Mock } {
	const { rerender } = render(
		<TextSelector
			selection={selection}
			defaultValue="flower"
			onChange={onChange}
			testId="variable-input-service"
		/>,
	);
	return {
		onChange,
		rerender: (next): void =>
			rerender(
				<TextSelector
					selection={next}
					defaultValue="flower"
					onChange={onChange}
					testId="variable-input-service"
				/>,
			),
	};
}

function input(): HTMLInputElement {
	return screen.getByTestId('variable-input-service') as HTMLInputElement;
}

describe('TextSelector', () => {
	it('shows the value the seed commits after mount', () => {
		// The bar mounts before the seed resolves the definition's default, so the first
		// render sees nothing selected. The box must follow the value once it lands.
		const { rerender } = renderSelector({ value: '', allSelected: false });

		rerender({ value: 'flower', allSelected: false });

		expect(input().value).toBe('flower');
	});

	it('follows a selection replaced from outside (share link, reset)', () => {
		const { rerender } = renderSelector({ value: 'flower', allSelected: false });

		rerender({ value: 'rose', allSelected: false });

		expect(input().value).toBe('rose');
	});

	it('keeps what the user types until they commit it', async () => {
		const user = userEvent.setup();
		const { onChange } = renderSelector({ value: 'flower', allSelected: false });

		await user.clear(input());
		await user.type(input(), 'tulip');

		// Still local — a keystroke must not cascade to dependent panels.
		expect(input().value).toBe('tulip');
		expect(onChange).not.toHaveBeenCalled();

		await user.tab();
		expect(onChange).toHaveBeenCalledWith({
			value: 'tulip',
			allSelected: false,
		});
	});

	it('restores the default when emptied', async () => {
		const user = userEvent.setup();
		const { onChange } = renderSelector({ value: 'tulip', allSelected: false });

		await user.clear(input());
		await user.tab();

		expect(onChange).toHaveBeenCalledWith({
			value: 'flower',
			allSelected: false,
		});
		expect(input().value).toBe('flower');
	});
});
