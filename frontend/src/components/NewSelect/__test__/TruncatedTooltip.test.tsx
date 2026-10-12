import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@signozhq/ui/tooltip';

import TruncatedTooltip from '../TruncatedTooltip';

const LABEL = '/oteldemo.RecommendationService/ListRecommendations';

function renderRow(scrollWidth: number, clientWidth: number): void {
	jest
		.spyOn(HTMLElement.prototype, 'scrollWidth', 'get')
		.mockReturnValue(scrollWidth);
	jest
		.spyOn(HTMLElement.prototype, 'clientWidth', 'get')
		.mockReturnValue(clientWidth);

	render(
		<TooltipProvider>
			<TruncatedTooltip title={LABEL}>
				{(textRef): JSX.Element => (
					<div data-testid="row">
						<span ref={textRef}>{LABEL}</span>
					</div>
				)}
			</TruncatedTooltip>
		</TooltipProvider>,
	);
}

async function hover(element: HTMLElement): Promise<void> {
	const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
	await user.hover(element);
	act(() => {
		jest.advanceTimersByTime(500);
	});
}

describe('TruncatedTooltip', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	it('reveals truncated text when its row is hovered', async () => {
		renderRow(400, 200);

		await hover(screen.getByTestId('row'));

		expect(screen.getByRole('tooltip')).toHaveTextContent(LABEL);
	});

	it('shows no tooltip when the text fits', async () => {
		renderRow(200, 200);

		await hover(screen.getByTestId('row'));

		expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
	});
});
