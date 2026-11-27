import { render, screen, userEvent } from 'tests/test-utils';

import { EMPTY_STATE_CHIPS_FALLBACK } from '../../emptyStateChipsFallback';
import { useEmptyStateChips } from '../../useEmptyStateChips';
import EmptyState from '../EmptyState';

jest.mock('../../useEmptyStateChips');

const mockChips = jest.mocked(useEmptyStateChips);

describe('EmptyState', () => {
	it('holds a placeholder for every prompt while they load', () => {
		mockChips.mockReturnValue({ chips: [], isLoading: true });

		render(<EmptyState onSendSuggestedPrompt={jest.fn()} />);

		expect(screen.getAllByTestId('empty-state-chip-skeleton')).toHaveLength(
			EMPTY_STATE_CHIPS_FALLBACK.length,
		);
	});

	it('sends a suggestion when it is clicked', async () => {
		const user = userEvent.setup();
		const onSend = jest.fn();
		mockChips.mockReturnValue({
			chips: [{ id: 'slow_queries', text: 'Find slow database queries' }],
			isLoading: false,
		});
		render(<EmptyState onSendSuggestedPrompt={onSend} />);

		await user.click(screen.getByTestId('empty-state-chip-slow_queries'));

		expect(onSend).toHaveBeenCalledWith('Find slow database queries');
	});
});
