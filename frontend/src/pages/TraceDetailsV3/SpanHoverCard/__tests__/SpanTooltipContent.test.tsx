import { render, screen } from '@testing-library/react';
import { SpanV3 } from 'types/api/trace/getTraceV3';

import { getSpanAiDetails, getUsageTotals } from '../aiUsage';
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

const usageAttributes = {
	'gen_ai.usage.input_tokens': 1000,
	'gen_ai.usage.output_tokens': 200,
	'gen_ai.usage.cache_read.input_tokens': 600,
	'gen_ai.usage.cache_creation.input_tokens': 100,
};

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
				isAnthropic: false,
			},
		});
	});

	it.each<Record<string, string>>([
		{ 'gen_ai.provider.name': 'Anthropic' },
		{ 'gen_ai.system': 'anthropic' },
		{ 'gen_ai.response.model': 'claude-sonnet-4' },
		{ 'gen_ai.request.model': 'anthropic.claude-v2' },
	])('detects Anthropic from %p', (attributes) => {
		expect(
			getSpanAiDetails(spanWith({ ...usageAttributes, ...attributes }))?.usage
				?.isAnthropic,
		).toBe(true);
	});
});

describe('getUsageTotals', () => {
	it('adds cache tokens to input for Anthropic', () => {
		const usage = getSpanAiDetails(
			spanWith({ ...usageAttributes, 'gen_ai.provider.name': 'anthropic' }),
		)?.usage;

		expect(usage && getUsageTotals(usage)).toStrictEqual({
			inputUsage: 1700,
			totalUsage: 1900,
		});
	});

	it('treats input as already including cache tokens for other providers', () => {
		const usage = getSpanAiDetails(
			spanWith({ ...usageAttributes, 'gen_ai.provider.name': 'openai' }),
		)?.usage;

		expect(usage && getUsageTotals(usage)).toStrictEqual({
			inputUsage: 1000,
			totalUsage: 1200,
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

	it('renders the usage breakdown with cache rows and cost', () => {
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
						isAnthropic: false,
					},
				}}
			/>,
		);

		expect(screen.getByText('Usage Breakdown')).toBeInTheDocument();
		expect(screen.getByText('1,000')).toBeInTheDocument();
		expect(screen.getByText('cache read')).toBeInTheDocument();
		expect(screen.getByText('600')).toBeInTheDocument();
		expect(screen.getByText('cache creation')).toBeInTheDocument();
		expect(screen.getByText('1,200')).toBeInTheDocument();
		expect(screen.getByText('$ 0.00000056')).toBeInTheDocument();
	});

	it('hides cache rows and cost when the attributes are absent', () => {
		render(
			<SpanTooltipContent
				{...baseProps}
				ai={{ usage: { inputTokens: 10, outputTokens: 5, isAnthropic: false } }}
			/>,
		);

		expect(screen.queryByText('cache read')).not.toBeInTheDocument();
		expect(screen.queryByText('cache creation')).not.toBeInTheDocument();
		expect(screen.queryByText('cost')).not.toBeInTheDocument();
	});
});
