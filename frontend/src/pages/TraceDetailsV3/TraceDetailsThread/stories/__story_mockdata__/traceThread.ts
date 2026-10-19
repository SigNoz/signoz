/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	type AiobservabilitytypesChatMessageDTO,
	AiobservabilitytypesBlobPartDTOType,
	AiobservabilitytypesCompactionPartDTOType,
	AiobservabilitytypesFilePartDTOType,
	type AiobservabilitytypesOutputMessageDTO,
	type AiobservabilitytypesPartDTO,
	AiobservabilitytypesReasoningPartDTOType,
	AiobservabilitytypesServerToolCallPartDTOType,
	AiobservabilitytypesServerToolCallResponsePartDTOType,
	AiobservabilitytypesTextPartDTOType,
	AiobservabilitytypesToolCallRequestPartDTOType,
	AiobservabilitytypesToolCallResponsePartDTOType,
	AiobservabilitytypesUriPartDTOType,
	type GetTraceThread200,
	type SpantypesThreadSpanDTO,
} from 'api/generated/services/sigNoz.schemas';

import { STORY_TRACE_ID } from '../../../stories/__story_mockdata__/traceDetails';

export const THREAD_SCENARIOS = [
	'conversation',
	'every-part',
	'roles-and-finish-reasons',
	'raw-attributes',
	'no-ai-spans',
] as const;

export type ThreadScenario = (typeof THREAD_SCENARIOS)[number];

export const THREAD_PAGINGS = [
	'single-page',
	'two-pages',
	'next-page-pending',
] as const;

export type ThreadPaging = (typeof THREAD_PAGINGS)[number];

export const SECOND_PAGE_CURSOR = 'page-2';

/** A span id the thread never returns, for an anchor the backend dropped. */
export const SPAN_WITHOUT_MESSAGES = 'ffffffffffffffff';

type Part = AiobservabilitytypesPartDTO;
type InputMessage = AiobservabilitytypesChatMessageDTO;
type OutputMessage = AiobservabilitytypesOutputMessageDTO;

const text = (content: string): Part => ({
	type: AiobservabilitytypesTextPartDTOType.text,
	content,
});

const reasoning = (content: string): Part => ({
	type: AiobservabilitytypesReasoningPartDTOType.reasoning,
	content,
});

const toolCall = (id: string, name: string, args: unknown): Part => ({
	type: AiobservabilitytypesToolCallRequestPartDTOType.tool_call,
	id,
	name,
	arguments: args,
});

const toolResult = (id: string, response: unknown): Part => ({
	type: AiobservabilitytypesToolCallResponsePartDTOType.tool_call_response,
	id,
	response,
});

const input = (role: string, parts: Part[]): InputMessage => ({ role, parts });

const output = (
	role: string,
	parts: Part[],
	finishReason?: string,
): OutputMessage => ({ role, parts, finish_reason: finishReason });

interface ThreadSpanTemplate {
	name: string;
	operation: 'chat' | 'execute_tool' | 'invoke_agent';
	input?: InputMessage[];
	output?: OutputMessage[];
	/** Raw `gen_ai.*.messages`, for spans the backend could not format. */
	rawInput?: unknown;
	rawOutput?: unknown;
}

const WEATHER_CALL = 'call_aA3FJchumEvBrIxxheORri8j';
const WEATHER = { city: 'Bengaluru', unit: 'c' };
const WEATHER_RESULT = {
	city: 'Bengaluru',
	unit: 'c',
	temperature: 27,
	condition: 'partly cloudy',
};
const QUESTION =
	'What is the weather in Bengaluru in celsius, and do I need an umbrella?';
const SYSTEM_PROMPT =
	'You are a travel assistant. Use the tools you have before answering, and keep answers short.';

const CONVERSATION: ThreadSpanTemplate[] = [
	{
		name: 'chat gpt-4o-mini',
		operation: 'chat',
		input: [
			input('system', [text(SYSTEM_PROMPT)]),
			input('user', [text(QUESTION)]),
		],
		output: [
			output(
				'assistant',
				[
					reasoning(
						'The user wants current conditions. I should call get_current_weather before answering.',
					),
					toolCall(WEATHER_CALL, 'get_current_weather', WEATHER),
				],
				'tool_call',
			),
		],
	},
	{
		name: 'execute_tool get_current_weather',
		operation: 'execute_tool',
		input: [
			input('assistant', [toolCall(WEATHER_CALL, 'get_current_weather', WEATHER)]),
		],
		output: [output('tool', [toolResult(WEATHER_CALL, WEATHER_RESULT)])],
	},
	{
		name: 'chat gpt-4o-mini',
		operation: 'chat',
		input: [
			input('user', [text(QUESTION)]),
			input('assistant', [toolCall(WEATHER_CALL, 'get_current_weather', WEATHER)]),
			input('tool', [toolResult(WEATHER_CALL, WEATHER_RESULT)]),
		],
		output: [
			output(
				'assistant',
				[
					text(
						'**Bengaluru right now:** 27 °C and partly cloudy.\n\n- No rain in the forecast for the next few hours.\n- A light umbrella is still worth carrying in the evening.',
					),
				],
				'stop',
			),
		],
	},
];

const LONG_ANSWER = Array.from(
	{ length: 14 },
	(_, i) =>
		`${i + 1}. Step ${i + 1} of the itinerary: leave the hotel, take the metro two stops, and walk the last few hundred metres to the next place on the list.`,
).join('\n');

const EVERY_PART: ThreadSpanTemplate[] = [
	{
		name: 'chat · text',
		operation: 'chat',
		input: [
			input('user', [text('Format the plan as markdown, with a code sample.')]),
		],
		output: [
			output(
				'assistant',
				[
					text(
						'## Plan\n\nUse `get_current_weather` first:\n\n```json\n{ "city": "Bengaluru", "unit": "c" }\n```',
					),
					text(LONG_ANSWER),
				],
				'stop',
			),
		],
	},
	{
		name: 'chat · reasoning',
		operation: 'chat',
		output: [
			output(
				'assistant',
				[
					reasoning('Two cities were asked for, so two tool calls are needed.'),
					{ type: AiobservabilitytypesReasoningPartDTOType.reasoning, content: '' },
				],
				'stop',
			),
		],
	},
	{
		name: 'chat · compaction',
		operation: 'chat',
		input: [
			input('assistant', [
				{
					type: AiobservabilitytypesCompactionPartDTOType.compaction,
					id: 'cmp_1',
					content:
						'Earlier turns summarised: the user is planning a weekend in Bengaluru.',
				},
				{ type: AiobservabilitytypesCompactionPartDTOType.compaction, id: 'cmp_2' },
			]),
		],
	},
	{
		name: 'chat · tool calls',
		operation: 'chat',
		output: [
			output(
				'assistant',
				[
					toolCall('call_object_args', 'get_current_weather', WEATHER),
					toolCall('call_streamed_args', 'get_current_weather', '{"city": "Beng'),
					toolCall('call_no_args', 'list_cities', undefined),
				],
				'tool_call',
			),
		],
	},
	{
		name: 'execute_tool · tool results',
		operation: 'execute_tool',
		input: [
			input('assistant', [
				toolCall('call_object_args', 'get_current_weather', WEATHER),
				toolCall('call_streamed_args', 'get_current_weather', '{"city": "Beng'),
				toolCall('call_no_args', 'list_cities', undefined),
			]),
			input('tool', [
				toolResult('call_object_args', '27 °C'),
				toolResult('call_streamed_args', WEATHER_RESULT),
				toolResult(
					'call_no_args',
					'Bengaluru, Mumbai, Delhi, Chennai, Kolkata, Hyderabad, Pune, Ahmedabad, Jaipur, Lucknow',
				),
				toolResult('call_not_in_span', 'A result whose call is not in this span'),
			]),
		],
	},
	{
		name: 'chat · server tools',
		operation: 'chat',
		// A client call sharing the server call's id, rendered first.
		input: [
			input('assistant', [
				toolCall('srv_search_1', 'lookup_city', { city: 'Bengaluru' }),
			]),
			input('tool', [toolResult('srv_search_1', 'Bengaluru, India')]),
		],
		output: [
			output(
				'assistant',
				[
					{
						type: AiobservabilitytypesServerToolCallPartDTOType.server_tool_call,
						id: 'srv_search_1',
						name: 'web_search',
						server_tool_call: {
							type: 'web_search',
							query: 'Bengaluru weather today',
						},
					},
					{
						type:
							AiobservabilitytypesServerToolCallResponsePartDTOType.server_tool_call_response,
						id: 'srv_search_1',
						server_tool_call_response: {
							type: 'web_search',
							results: [
								{ title: 'Bengaluru forecast', url: 'https://example.com/weather' },
							],
						},
					},
				],
				'stop',
			),
		],
	},
	{
		name: 'chat · media',
		operation: 'chat',
		input: [
			input('user', [
				{
					type: AiobservabilitytypesBlobPartDTOType.blob,
					modality: 'image',
					mime_type: 'image/png',
					content: 'iVBORw0KGgo'.repeat(40),
				},
				{
					type: AiobservabilitytypesFilePartDTOType.file,
					modality: 'document',
					mime_type: 'application/pdf',
					file_id: 'file-itinerary-pdf',
				},
				{
					type: AiobservabilitytypesUriPartDTOType.uri,
					modality: 'image',
					uri: 'https://example.com/map.png',
				},
			]),
		],
	},
	{
		name: 'chat · generic',
		operation: 'chat',
		output: [
			output(
				'assistant',
				[
					{
						type: 'generic',
						content: 'A part the formatter did not recognise, kept as text.',
					},
					{
						type: 'generic',
						content: {
							type: 'tool-call',
							toolName: 'get_current_weather',
							args: WEATHER,
						},
					},
				],
				'stop',
			),
		],
	},
];

const ROLES_AND_FINISH_REASONS: ThreadSpanTemplate[] = [
	{
		name: 'chat · roles',
		operation: 'chat',
		input: [
			input('system', [text(SYSTEM_PROMPT)]),
			input('developer', [text('Answer in metric units.')]),
			input('user', [text(QUESTION)]),
			input('assistant', [text('Checking the weather now.')]),
			input('tool', [toolResult(WEATHER_CALL, WEATHER_RESULT)]),
			input('', [text('A message with no role renders without a header.')]),
			input('user', []),
		],
	},
	{
		name: 'chat · finish reasons',
		operation: 'chat',
		output: [
			output('assistant', [text('Finished normally.')], 'stop'),
			output('assistant', [text('Stopped to call a tool.')], 'tool_call'),
			output('assistant', [text('Cut off at the token limit…')], 'length'),
			output(
				'assistant',
				[text('Blocked by the content filter.')],
				'content_filter',
			),
			output('assistant', [text('The provider returned an error.')], 'error'),
			output('assistant', [text('The context was compacted.')], 'compaction'),
		],
	},
];

/** What the backend returns today for a Vercel AI SDK span it cannot format. */
const RAW_ATTRIBUTES: ThreadSpanTemplate[] = [
	{
		name: 'ai.streamText.doStream',
		operation: 'chat',
		rawInput: [{ role: 'user', content: [{ type: 'text', text: QUESTION }] }],
		rawOutput: [
			{
				type: 'tool-call',
				toolCallId: WEATHER_CALL,
				toolName: 'get_current_weather',
				args: WEATHER,
			},
		],
	},
	{ name: 'ai.toolCall', operation: 'execute_tool' },
];

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

export const threadSpanCount = (scenario: ThreadScenario): number =>
	SCENARIO_TEMPLATES[scenario].length;

interface ThreadPageOptions {
	scenario: ThreadScenario;
	paging: ThreadPaging;
	traceStart: number;
	after: string | null;
}

/** The first page, or the second when `after` is its cursor. */
export const traceThreadResponse = ({
	scenario,
	paging,
	traceStart,
	after,
}: ThreadPageOptions): GetTraceThread200 => {
	const spans = SCENARIO_TEMPLATES[scenario].map((template, index) =>
		toSpan(template, index, traceStart),
	);
	const split =
		paging === 'single-page' ? spans.length : Math.ceil(spans.length / 2);
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
