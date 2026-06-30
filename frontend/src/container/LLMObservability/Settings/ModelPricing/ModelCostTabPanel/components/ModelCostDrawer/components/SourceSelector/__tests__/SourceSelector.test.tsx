import { render, screen, userEvent } from 'tests/test-utils';

import SourceSelector from '../SourceSelector';

describe('SourceSelector', () => {
	it('calls onChange(true) when picking override while currently auto', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onChange = jest.fn();
		render(
			<SourceSelector isOverride={false} isReadOnly={false} onChange={onChange} />,
		);

		await user.click(screen.getByTestId('drawer-source-override'));

		expect(onChange).toHaveBeenCalledWith(true);
	});

	it('shows the reset confirm UI without calling onChange when switching to auto from override', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onChange = jest.fn();
		render(<SourceSelector isOverride isReadOnly={false} onChange={onChange} />);

		await user.click(screen.getByTestId('drawer-source-auto'));

		expect(screen.getByTestId('drawer-reset-keep-btn')).toBeInTheDocument();
		expect(screen.getByTestId('drawer-reset-confirm-btn')).toBeInTheDocument();
		expect(onChange).not.toHaveBeenCalled();
	});

	it('hides the confirm UI and does not call onChange when Keep is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onChange = jest.fn();
		render(<SourceSelector isOverride isReadOnly={false} onChange={onChange} />);

		await user.click(screen.getByTestId('drawer-source-auto'));
		await user.click(screen.getByTestId('drawer-reset-keep-btn'));

		expect(
			screen.queryByTestId('drawer-reset-confirm-btn'),
		).not.toBeInTheDocument();
		expect(onChange).not.toHaveBeenCalled();
	});

	it('calls onChange(false) when Reset is confirmed', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onChange = jest.fn();
		render(<SourceSelector isOverride isReadOnly={false} onChange={onChange} />);

		await user.click(screen.getByTestId('drawer-source-auto'));
		await user.click(screen.getByTestId('drawer-reset-confirm-btn'));

		expect(onChange).toHaveBeenCalledWith(false);
		expect(
			screen.queryByTestId('drawer-reset-confirm-btn'),
		).not.toBeInTheDocument();
	});

	it('shows the managed label when read-only', () => {
		render(<SourceSelector isOverride isReadOnly onChange={jest.fn()} />);

		expect(screen.getByTestId('drawer-managed-label')).toBeInTheDocument();
	});

	it('disables the auto radio when disableAuto is set', () => {
		render(
			<SourceSelector
				isOverride
				isReadOnly={false}
				disableAuto
				onChange={jest.fn()}
			/>,
		);

		expect(screen.getByTestId('drawer-source-auto')).toBeDisabled();
	});
});
