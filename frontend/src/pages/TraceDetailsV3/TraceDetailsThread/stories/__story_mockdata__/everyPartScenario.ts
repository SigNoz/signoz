/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	AiobservabilitytypesBlobPartDTOType,
	AiobservabilitytypesCompactionPartDTOType,
	AiobservabilitytypesFilePartDTOType,
	AiobservabilitytypesReasoningPartDTOType,
	AiobservabilitytypesServerToolCallPartDTOType,
	AiobservabilitytypesServerToolCallResponsePartDTOType,
	AiobservabilitytypesUriPartDTOType,
} from 'api/generated/services/sigNoz.schemas';

import {
	input,
	output,
	reasoning,
	text,
	toolCall,
	toolResult,
	WEATHER,
	WEATHER_RESULT,
} from './threadParts';
import type { ThreadSpanTemplate } from './types';

const LONG_ANSWER = Array.from(
	{ length: 14 },
	(_, i) =>
		`${i + 1}. Step ${i + 1} of the itinerary: leave the hotel, take the metro two stops, and walk the last few hundred metres to the next place on the list.`,
).join('\n');

export const EVERY_PART: ThreadSpanTemplate[] = [
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
