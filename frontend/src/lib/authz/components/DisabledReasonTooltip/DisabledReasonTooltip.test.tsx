import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import DisabledReasonTooltip from './DisabledReasonTooltip';

const REASON = 'You need update access on this dashboard';

function DisabledRow({ reason }: { reason: string }): JSX.Element {
	return (
		<DisabledReasonTooltip reason={reason} kind="denied" asChild>
			<span data-testid="row">
				<button type="button" disabled>
					Rename
				</button>
			</span>
		</DisabledReasonTooltip>
	);
}

describe('DisabledReasonTooltip', () => {
	it('renders children bare when there is no reason', () => {
		render(<DisabledRow reason="" />);

		expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument();
		expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
	});

	it('explains the block on hover', async () => {
		render(<DisabledRow reason={REASON} />);

		await userEvent.hover(screen.getByTestId('row'));

		await expect(screen.findByText(REASON)).resolves.toBeInTheDocument();
	});

	it('keeps the reason visible when the dead control is clicked', async () => {
		render(<DisabledRow reason={REASON} />);

		const row = screen.getByTestId('row');
		await userEvent.hover(row);
		await screen.findByText(REASON);

		await userEvent.click(row);

		// Radix closes on pointerdown and click; a disabled control's explanation
		// has to survive both, since clicking it is how a user asks why.
		await waitFor(() => {
			expect(screen.getByText(REASON)).toBeInTheDocument();
		});
	});
});
