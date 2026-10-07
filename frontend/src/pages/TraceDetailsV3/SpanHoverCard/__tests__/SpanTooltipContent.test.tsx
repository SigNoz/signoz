import { render, screen } from '@testing-library/react';
import { SpanV3 } from 'types/api/trace/getTraceV3';

import { getSpanAiDetails } from '../aiUsage';
import { SpanTooltipContent } from '../SpanHoverCard';

const baseProps = {
	spanName: 'chat gpt-4o',
	color: '#fff',
	hasError: false,
	relativeStartMs: 268,
	durationMs: 1110,
};

const spanWith = (attributes: Record<string, string | number>): SpanV3 =>
	({ attributes, resource: {} }) as unknown as SpanV3;

describe('getSpanAiDetails', () => {
	it('returns undefined for a span without gen_ai attributes', () => {
		expect(getSpanAiDetails(spanWith({ 'http.method': 'GET' }))).toBeUndefined();
	});

	it('reads model, tool, agent, token usage and cost', () => {
		expect(
			getSpanAiDetails(
				spanWith({
					'gen_ai.request.model': 'gpt-4o',
					'gen_ai.tool.name': 'search',
					'gen_ai.agent.name': 'planner',
					'gen_ai.usage.input_tokens': '120',
					'gen_ai.usage.output_tokens': 30,
					'signoz.gen_ai.usage.tokens.cost': '0.00000056',
				}),
			),
		).toStrictEqual({
			model: 'gpt-4o',
			toolName: 'search',
			agentName: 'planner',
			usage: {
				inputTokens: 120,
				outputTokens: 30,
				cacheReadTokens: undefined,
				cacheCreationTokens: undefined,
				cost: 0.00000056,
			},
		});
	});
});

describe('SpanTooltipContent', () => {
	it('renders status, start and duration for a non-AI span', () => {
		render(<SpanTooltipContent {...baseProps} />);

		expect(screen.getByText('chat gpt-4o')).toBeInTheDocument();
		expect(screen.getByText('ok')).toBeInTheDocument();
		expect(screen.getByText('268 ms')).toBeInTheDocument();
		expect(screen.getByText('1.11 s')).toBeInTheDocument();
		expect(screen.queryByText('Usage Breakdown')).not.toBeInTheDocument();
	});

	it('renders raw input, cache and output tokens with cost', () => {
		render(
			<SpanTooltipContent
				{...baseProps}
				ai={{
					model: 'gpt-4o',
					usage: {
						inputTokens: 1000,
						outputTokens: 200,
						cacheReadTokens: 600,
						cacheCreationTokens: 100,
						cost: 0.00000056,
					},
				}}
			/>,
		);

		expect(screen.getByText('Usage Breakdown')).toBeInTheDocument();
		expect(screen.getByText('Input')).toBeInTheDocument();
		expect(screen.getByText('1,000')).toBeInTheDocument();
		expect(screen.getByText('Cache')).toBeInTheDocument();
		expect(screen.getByText('Cache read')).toBeInTheDocument();
		expect(screen.getByText('600')).toBeInTheDocument();
		expect(screen.getByText('Cache write')).toBeInTheDocument();
		expect(screen.getByText('100')).toBeInTheDocument();
		expect(screen.getByText('Output')).toBeInTheDocument();
		expect(screen.getByText('200')).toBeInTheDocument();
		// Raw values only: no derived input or total usage.
		expect(screen.queryByText('1,700')).not.toBeInTheDocument();
		expect(screen.queryByText('1,200')).not.toBeInTheDocument();
		expect(screen.getByText('$ 0.00000056')).toBeInTheDocument();
	});

	it('hides a zero cache row, and the cache group when both are zero', () => {
		const { rerender } = render(
			<SpanTooltipContent
				{...baseProps}
				ai={{
					usage: {
						inputTokens: 194,
						outputTokens: 32,
						cacheReadTokens: 50,
						cacheCreationTokens: 0,
					},
				}}
			/>,
		);

		expect(screen.getByText('Cache read')).toBeInTheDocument();
		expect(screen.queryByText('Cache write')).not.toBeInTheDocument();

		rerender(
			<SpanTooltipContent
				{...baseProps}
				ai={{
					usage: {
						inputTokens: 194,
						outputTokens: 32,
						cacheReadTokens: 0,
						cacheCreationTokens: 0,
					},
				}}
			/>,
		);

		expect(screen.queryByText('Cache')).not.toBeInTheDocument();
		expect(screen.queryByText('Cache read')).not.toBeInTheDocument();
	});

	it('hides cache rows and cost when the attributes are absent', () => {
		render(
			<SpanTooltipContent
				{...baseProps}
				ai={{ usage: { inputTokens: 10, outputTokens: 5 } }}
			/>,
		);

		expect(screen.queryByText('Cache')).not.toBeInTheDocument();
		expect(screen.queryByText('Cache read')).not.toBeInTheDocument();
		expect(screen.queryByText('Cache write')).not.toBeInTheDocument();
		expect(screen.queryByText('cost')).not.toBeInTheDocument();
	});
});
