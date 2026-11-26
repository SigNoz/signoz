/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	input,
	output,
	QUESTION,
	reasoning,
	SYSTEM_PROMPT,
	text,
	toolCall,
	toolResult,
	WEATHER,
	WEATHER_CALL,
	WEATHER_RESULT,
} from './threadParts';
import type { ThreadSpanTemplate } from './types';

export const CONVERSATION: ThreadSpanTemplate[] = [
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

export const ROLES_AND_FINISH_REASONS: ThreadSpanTemplate[] = [
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
export const RAW_ATTRIBUTES: ThreadSpanTemplate[] = [
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
