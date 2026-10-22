import { render, screen, userEvent } from 'tests/test-utils';

import AIThreadMessage from '../AIThreadMessage';
import JsonBlock from '../JsonBlock';
import { MessageType } from '../types';

// jsdom has no layout, so the tree height JsonBlock measures is set per test.
let mockTreeHeight = 0;
jest.mock('hooks/useDimensions', () => ({
	useResizeObserver: (): { width: number; height: number } => ({
		width: 0,
		height: mockTreeHeight,
	}),
}));

beforeEach(() => {
	mockTreeHeight = 0;
});

describe('AIThreadMessage', () => {
	it('shows the Output badge when the message has no role', () => {
		render(
			<AIThreadMessage
				message={{ parts: [{ type: 'text', content: 'hi' }] }}
				messageType={MessageType.Output}
			/>,
		);

		expect(screen.getByTestId('ai-message-output-badge')).toBeInTheDocument();
	});

	it.each([
		['blank text', { type: 'text' as const, content: '  ' }],
		['empty generic', { type: 'generic' as const, content: '' }],
	])('renders No content for a %s part', (_label, part) => {
		render(<AIThreadMessage message={{ role: 'user', parts: [part] }} />);

		expect(screen.getByTestId('ai-message-empty-part')).toHaveTextContent(
			'No content',
		);
	});

	it('hides system message parts until the toggle is clicked', async () => {
		const user = userEvent.setup();
		render(
			<AIThreadMessage
				message={{ role: 'system', parts: [{ type: 'text', content: 'be brief' }] }}
			/>,
		);

		expect(screen.queryByText('be brief')).not.toBeInTheDocument();
		await user.click(screen.getByTestId('ai-message-system-toggle'));
		expect(screen.getByText('be brief')).toBeInTheDocument();
	});

	it('shows the finish reason', () => {
		render(
			<AIThreadMessage
				message={{
					role: 'assistant',
					parts: [{ type: 'text', content: 'hi' }],
					finish_reason: 'stop',
				}}
			/>,
		);

		expect(screen.getByTestId('ai-message-finish-reason')).toHaveTextContent(
			'stop',
		);
	});
});

describe('JsonBlock', () => {
	it('collapses JSON taller than 10 rows behind Show more', async () => {
		mockTreeHeight = 300;
		const user = userEvent.setup();
		render(<JsonBlock data={{ a: 1 }} />);

		const toggle = screen.getByTestId('ai-json-show-more');
		expect(toggle).toHaveTextContent('Show more');
		await user.click(toggle);
		expect(toggle).toHaveTextContent('Show less');
	});

	it('does not collapse JSON of 10 rows or fewer', () => {
		mockTreeHeight = 220;
		render(<JsonBlock data={{ a: 1 }} />);

		expect(screen.queryByTestId('ai-json-show-more')).not.toBeInTheDocument();
	});

	it('renders a copy button', () => {
		render(<JsonBlock data={{ a: 1 }} />);

		expect(screen.getByTestId('ai-json-copy')).toBeInTheDocument();
	});
});
