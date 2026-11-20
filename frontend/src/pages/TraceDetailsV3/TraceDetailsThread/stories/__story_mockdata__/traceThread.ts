/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	type GetTraceThread200,
	type SpantypesThreadSpanDTO,
} from 'api/generated/services/sigNoz.schemas';

import { STORY_TRACE_ID } from '../../../stories/__story_mockdata__/traceDetails';
import type {
	ThreadPageOptions,
	ThreadScenario,
	ThreadSpanTemplate,
} from './types';
import { EVERY_PART } from './everyPartScenario';
import {
	CONVERSATION,
	RAW_ATTRIBUTES,
	ROLES_AND_FINISH_REASONS,
} from './threadScenarios';

export const THREAD_SCENARIOS = [
	'conversation',
	'every-part',
	'roles-and-finish-reasons',
	'raw-attributes',
	'no-ai-spans',
] as const;

export const THREAD_PAGINGS = [
	'single-page',
	'two-pages',
	'next-page-pending',
] as const;

export const SECOND_PAGE_CURSOR = 'page-2';

/** A span id the thread never returns, for an anchor the backend dropped. */
export const SPAN_WITHOUT_MESSAGES = 'ffffffffffffffff';

const SCENARIO_TEMPLATES: Record<ThreadScenario, ThreadSpanTemplate[]> = {
	conversation: CONVERSATION,
	'every-part': EVERY_PART,
	'roles-and-finish-reasons': ROLES_AND_FINISH_REASONS,
	'raw-attributes': RAW_ATTRIBUTES,
	'no-ai-spans': [],
};

const PARENT_SPAN_ID = 'a3911d2fd3180f00';

export const threadSpanIdAt = (index: number): string =>
	`53d3b6e6de50${(0x5cb6 + index).toString(16).padStart(4, '0')}`;

const toSpan = (
	template: ThreadSpanTemplate,
	index: number,
	traceStart: number,
): SpantypesThreadSpanDTO => {
	const attributes: Record<string, unknown> = {
		'gen_ai.operation.name': template.operation,
		'gen_ai.provider.name': 'openai',
	};

	if (template.operation === 'chat') {
		attributes['gen_ai.request.model'] = 'gpt-4o-mini';
		attributes['gen_ai.usage.input_tokens'] = 71 + index * 12;
		attributes['gen_ai.usage.output_tokens'] = 22 + index * 5;
	}
	if (template.operation === 'execute_tool') {
		attributes['gen_ai.tool.name'] = 'get_current_weather';
	}

	const rawInput = template.rawInput ?? template.input;
	const rawOutput = template.rawOutput ?? template.output;
	if (rawInput) {
		attributes['gen_ai.input.messages'] = JSON.stringify(rawInput);
	}
	if (rawOutput) {
		attributes['gen_ai.output.messages'] = JSON.stringify(rawOutput);
	}

	return {
		span_id: threadSpanIdAt(index),
		trace_id: STORY_TRACE_ID,
		parent_span_id: PARENT_SPAN_ID,
		name: template.name,
		kind_string: 'Internal',
		time_unix: Math.round(traceStart + index * 1_200),
		duration_nano: 1_113_318_541,
		has_error: false,
		status_code_string: 'Unset',
		status_message: '',
		resource: {
			'service.name': 'travel-assistant',
			'deployment.environment': 'production',
		},
		attributes,
		events: [],
		references: [
			{ traceId: STORY_TRACE_ID, spanId: PARENT_SPAN_ID, refType: 'CHILD_OF' },
		],
		formattedInput: template.input ?? [],
		formattedOutput: template.output ?? [],
		formatterWarnings: [],
	};
};

/** The first page, holding `spanId` if given, or the second when `after` is its cursor. */
export const traceThreadResponse = ({
	scenario,
	paging,
	traceStart,
	after,
	spanId,
}: ThreadPageOptions): GetTraceThread200 => {
	const spans = SCENARIO_TEMPLATES[scenario].map((template, index) =>
		toSpan(template, index, traceStart),
	);
	const half =
		paging === 'single-page' ? spans.length : Math.ceil(spans.length / 2);
	const split = Math.max(
		half,
		spans.findIndex((span) => span.span_id === spanId) + 1,
	);
	const isSecondPage = after === SECOND_PAGE_CURSOR;

	return {
		status: 'success',
		data: isSecondPage
			? { spans: spans.slice(split) }
			: {
					spans: spans.slice(0, split),
					nextCursor: split < spans.length ? SECOND_PAGE_CURSOR : undefined,
				},
	};
};
