import { render, screen } from 'tests/test-utils';

import { ThreadSpan, ThreadView } from '../../TraceDetailsThread/types';
import { GEN_AI_KEYS } from '../../utils/aiTraceUtils';
import SpanMessages from '../SpanMessages';

const makeSpan = (overrides: Partial<ThreadSpan>): ThreadSpan =>
	({ span_id: 's1', attributes: {}, ...overrides }) as unknown as ThreadSpan;

describe('SpanMessages', () => {
	it('shows the empty state when there are no formatted messages', () => {
		const span = makeSpan({
			attributes: { [GEN_AI_KEYS.inputMessages]: '[{"role":"user"}]' },
		} as Partial<ThreadSpan>);

		render(<SpanMessages span={span} view={ThreadView.Formatted} />);

		expect(screen.getByTestId('span-messages-empty')).toHaveTextContent(
			'This span has no input or output.',
		);
	});

	it('shows the empty state in JSON view when there are no raw messages', () => {
		render(<SpanMessages span={makeSpan({})} view={ThreadView.Json} />);

		expect(screen.getByTestId('span-messages-empty')).toBeInTheDocument();
	});

	it('renders raw messages in JSON view', () => {
		const span = makeSpan({
			attributes: { [GEN_AI_KEYS.outputMessages]: '[{"role":"assistant"}]' },
		} as Partial<ThreadSpan>);

		render(<SpanMessages span={span} view={ThreadView.Json} />);

		expect(screen.getByTestId('span-messages-json')).toBeInTheDocument();
	});

	it('opens every key in JSON view', () => {
		const span = makeSpan({
			attributes: {
				[GEN_AI_KEYS.inputMessages]: '[{"role":"user","content":"visible-text"}]',
			},
		} as Partial<ThreadSpan>);

		render(<SpanMessages span={span} view={ThreadView.Json} />);

		expect(screen.getByText(/visible-text/)).toBeInTheDocument();
	});

	it('collapses large JSON behind Show more in JSON view', () => {
		const span = makeSpan({
			attributes: {
				[GEN_AI_KEYS.inputMessages]: JSON.stringify([
					{ role: 'user', content: 'x'.repeat(2000) },
				]),
			},
		} as Partial<ThreadSpan>);

		render(<SpanMessages span={span} view={ThreadView.Json} />);

		expect(screen.getByTestId('ai-json-show-more')).toHaveTextContent(
			'Show more',
		);
	});
});
