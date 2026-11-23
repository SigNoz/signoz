import { render, screen, userEvent } from 'tests/test-utils';

import type { ActivityItem } from '../ActivityGroup';
import ActivityGroup from '../ActivityGroup';

const steps: ActivityItem[] = [
	{ id: 'thought-1', kind: 'thinking', content: 'Checking the error rate' },
	{
		id: 'call-1',
		kind: 'tool',
		toolCall: {
			toolName: 'signoz_search_logs',
			input: {},
			done: false,
		},
	},
];

describe('ActivityGroup', () => {
	it('names the running step and opens the steps so far on request', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<ActivityGroup items={steps} isLive />);

		const toggle = screen.getByTestId('ai-activity-toggle');
		expect(toggle).toHaveTextContent('Search Logs');
		expect(screen.queryByTestId('ai-activity-step')).not.toBeInTheDocument();

		await user.click(toggle);

		const shown = screen.getAllByTestId('ai-activity-step');
		expect(shown).toHaveLength(2);
		expect(shown[0]).toHaveTextContent(
			'Thought for a few secondsChecking the error rate',
		);
		expect(shown[1]).toHaveTextContent('Search Logs');
	});

	it('folds a finished run behind its step count', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<ActivityGroup items={steps} />);

		const toggle = screen.getByTestId('ai-activity-toggle');
		expect(toggle).toHaveTextContent('Worked through 2 steps');
		expect(screen.queryByTestId('ai-activity-step')).not.toBeInTheDocument();

		await user.click(toggle);

		expect(screen.getAllByTestId('ai-activity-step')).toHaveLength(2);
	});
});
