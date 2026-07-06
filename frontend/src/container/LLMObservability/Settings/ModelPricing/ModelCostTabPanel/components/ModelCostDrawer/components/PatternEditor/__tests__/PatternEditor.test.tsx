import { fireEvent, render, screen, userEvent } from 'tests/test-utils';

import PatternEditor from '../PatternEditor';

describe('PatternEditor', () => {
	it('adds a typed pattern via the Add button', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onChange = jest.fn();
		render(
			<PatternEditor
				patterns={['gpt-4o']}
				isReadOnly={false}
				onChange={onChange}
			/>,
		);

		await user.type(screen.getByTestId('drawer-pattern-input'), 'gpt-5');
		await user.click(screen.getByTestId('drawer-pattern-add-btn'));

		expect(onChange).toHaveBeenCalledWith(['gpt-4o', 'gpt-5']);
	});

	it('adds a pattern when Enter is pressed', () => {
		const onChange = jest.fn();
		render(
			<PatternEditor patterns={[]} isReadOnly={false} onChange={onChange} />,
		);

		const input = screen.getByTestId('drawer-pattern-input');
		fireEvent.change(input, { target: { value: 'claude' } });
		fireEvent.keyDown(input, { key: 'Enter' });

		expect(onChange).toHaveBeenCalledWith(['claude']);
	});

	it('does not call onChange for a duplicate and clears the input', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onChange = jest.fn();
		render(
			<PatternEditor
				patterns={['gpt-4o']}
				isReadOnly={false}
				onChange={onChange}
			/>,
		);

		const input = screen.getByTestId('drawer-pattern-input') as HTMLInputElement;
		await user.type(input, 'gpt-4o');
		await user.click(screen.getByTestId('drawer-pattern-add-btn'));

		expect(onChange).not.toHaveBeenCalled();
		expect(input.value).toBe('');
	});

	it('trims surrounding whitespace before adding', () => {
		const onChange = jest.fn();
		render(
			<PatternEditor patterns={[]} isReadOnly={false} onChange={onChange} />,
		);

		const input = screen.getByTestId('drawer-pattern-input');
		fireEvent.change(input, { target: { value: '  gemini  ' } });
		fireEvent.keyDown(input, { key: 'Enter' });

		expect(onChange).toHaveBeenCalledWith(['gemini']);
	});

	it('removes a pattern when its chip remove button is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onChange = jest.fn();
		render(
			<PatternEditor
				patterns={['gpt-4o', 'gpt-5']}
				isReadOnly={false}
				onChange={onChange}
			/>,
		);

		await user.click(
			screen.getByRole('button', { name: 'Remove pattern gpt-4o' }),
		);

		expect(onChange).toHaveBeenCalledWith(['gpt-5']);
	});

	it('renders chips without remove buttons and no input when read-only', () => {
		render(
			<PatternEditor patterns={['gpt-4o']} isReadOnly onChange={jest.fn()} />,
		);

		expect(screen.queryByTestId('drawer-pattern-input')).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('drawer-pattern-add-btn'),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: 'Remove pattern gpt-4o' }),
		).not.toBeInTheDocument();
	});
});
