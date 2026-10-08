import { SpanV3 } from 'types/api/trace/getTraceV3';

import {
	AiSpanKind,
	getAiSpanKind,
	getTotalInputTokens,
	isAiSpan,
} from '../genAi';

const spanWith = (attributes: Record<string, string | number>): SpanV3 =>
	({ attributes, resource: {} }) as unknown as SpanV3;

describe('getAiSpanKind', () => {
	it.each<[Record<string, string | number>, AiSpanKind]>([
		[{ 'gen_ai.request.model': 'gpt-4o' }, AiSpanKind.Llm],
		[{ 'gen_ai.usage.input_tokens': 0 }, AiSpanKind.Llm],
		[{ 'gen_ai.usage.reasoning.output_tokens': 12 }, AiSpanKind.Llm],
		[{ 'gen_ai.tool.name': 'search' }, AiSpanKind.Tool],
		[{ 'gen_ai.agent.name': 'planner' }, AiSpanKind.Agent],
		[
			{ 'gen_ai.tool.name': 'search', 'gen_ai.request.model': 'gpt-4o' },
			AiSpanKind.Tool,
		],
		[
			{ 'gen_ai.agent.name': 'planner', 'gen_ai.usage.input_tokens': 10 },
			AiSpanKind.Agent,
		],
	])('classifies %p as %s', (attributes, kind) => {
		expect(getAiSpanKind(spanWith(attributes))).toBe(kind);
	});

	it('returns undefined for non-AI spans and empty values', () => {
		expect(getAiSpanKind(spanWith({ 'http.method': 'GET' }))).toBeUndefined();
		expect(getAiSpanKind(spanWith({ 'gen_ai.tool.name': '' }))).toBeUndefined();
		expect(isAiSpan(spanWith({}))).toBe(false);
	});
});

describe('getTotalInputTokens', () => {
	it.each([
		// Cache reported inside input (OpenAI): input already includes it.
		[{ input: 1000, cacheRead: 600, cacheWrite: 100 }, 1000],
		// Cache reported separately (Anthropic): add it.
		[{ input: 50, cacheRead: 600, cacheWrite: 100 }, 750],
		[{ input: 71, cacheRead: 0, cacheWrite: 0 }, 71],
		[{ input: 10 }, 10],
		[{ cacheRead: 600 }, undefined],
	])('%p → %p', (tokens, expected) => {
		expect(getTotalInputTokens(tokens)).toBe(expected);
	});
});
