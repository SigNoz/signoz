import { render, screen, within } from 'tests/test-utils';

import { ThreadSpan, ThreadView } from '../../TraceDetailsThread/types';
import { GEN_AI_KEYS } from '../../utils/aiTraceUtils';
import SpanMessages from '../SpanMessages';

// jsdom has no layout; report a JSON tree taller than the 10-row clamp.
jest.mock('hooks/useDimensions', () => ({
	useResizeObserver: (): { width: number; height: number } => ({
		width: 0,
		height: 300,
	}),
}));

const makeSpan = (overrides: Partial<ThreadSpan>): ThreadSpan =>
	({ span_id: 's1', attributes: {}, ...overrides }) as unknown as ThreadSpan;

describe('SpanMessages', () => {
	it('shows the empty state when there are no formatted messages', () => {
		const span = makeSpan({
			attributes: { [GEN_AI_KEYS.inputMessages]: '[{"role":"user"}]' },
		});

		render(<SpanMessages span={span} view={ThreadView.Formatted} />);

		expect(screen.getByTestId('span-messages-empty')).toHaveTextContent(
			'This span has no input or output.',
		);
	});

	it('renders formatted input and output messages', () => {
		const span = makeSpan({
			formattedInput: [
				{ role: 'user', parts: [{ type: 'text', content: 'question' }] },
			],
			formattedOutput: [
				{ role: 'assistant', parts: [{ type: 'text', content: 'answer' }] },
			],
		});

		render(<SpanMessages span={span} view={ThreadView.Formatted} />);

		expect(
			within(screen.getByTestId('span-messages-input')).getByText('question'),
		).toBeInTheDocument();
		expect(
			within(screen.getByTestId('span-messages-output')).getByText('answer'),
		).toBeInTheDocument();
	});

	it('shows the empty state in JSON view when there are no raw messages', () => {
		render(<SpanMessages span={makeSpan({})} view={ThreadView.Json} />);

		expect(screen.getByTestId('span-messages-empty')).toBeInTheDocument();
	});

	it('renders raw messages in JSON view', () => {
		const span = makeSpan({
			attributes: { [GEN_AI_KEYS.outputMessages]: '[{"role":"assistant"}]' },
		});

		render(<SpanMessages span={span} view={ThreadView.Json} />);

		expect(screen.getByTestId('span-messages-json')).toBeInTheDocument();
	});

	it('opens every key in JSON view', () => {
		const span = makeSpan({
			attributes: {
				[GEN_AI_KEYS.inputMessages]: '[{"role":"user","content":"visible-text"}]',
			},
		});

		render(<SpanMessages span={span} view={ThreadView.Json} />);

		expect(screen.getByText(/visible-text/)).toBeInTheDocument();
	});

	it('collapses tall JSON behind Show more in JSON view', () => {
		const span = makeSpan({
			attributes: {
				[GEN_AI_KEYS.inputMessages]: JSON.stringify([
					{ role: 'user', content: 'hi' },
				]),
			},
		});

		render(<SpanMessages span={span} view={ThreadView.Json} />);

		expect(screen.getByTestId('ai-json-show-more')).toHaveTextContent(
			'Show more',
		);
	});
});
