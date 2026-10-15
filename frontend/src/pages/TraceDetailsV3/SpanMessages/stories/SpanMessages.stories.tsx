import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';

import { ThreadSpan, ThreadView } from '../../TraceDetailsThread/types';
import { GEN_AI_KEYS } from '../../utils/aiTraceUtils';
import SpanMessages from '../SpanMessages';

const makeSpan = (overrides: Partial<ThreadSpan>): ThreadSpan =>
	({
		span_id: 'span-1',
		name: 'chat gpt-4o',
		attributes: {},
		...overrides,
	}) as unknown as ThreadSpan;

const LARGE_ARGUMENTS = {
	query: 'weather forecast',
	locations: Array.from({ length: 12 }, (_, index) => ({
		city: `City ${index + 1}`,
		coordinates: { lat: 10 + index, lon: 20 + index },
		units: 'metric',
	})),
};

const RAW_INPUT = [
	{
		role: 'system',
		parts: [{ type: 'text', content: 'You are a weather bot.' }],
	},
	{
		role: 'user',
		parts: [{ type: 'text', content: 'What is the weather in every city?' }],
	},
];

const RAW_OUTPUT = [
	{
		role: 'assistant',
		parts: [
			{
				type: 'tool_call',
				id: 'call_1',
				name: 'get_weather',
				arguments: LARGE_ARGUMENTS,
			},
		],
		finish_reason: 'tool_call',
	},
];

const rawAttributes = {
	[GEN_AI_KEYS.inputMessages]: JSON.stringify(RAW_INPUT),
	[GEN_AI_KEYS.outputMessages]: JSON.stringify(RAW_OUTPUT),
};

const clickShowMore = async (canvasElement: HTMLElement): Promise<void> => {
	const toggles =
		await within(canvasElement).findAllByTestId('ai-json-show-more');
	await toggles.reduce(
		(previous, toggle) => previous.then(() => userEvent.click(toggle)),
		Promise.resolve(),
	);
};

// Input and output messages of one AI span, as rendered on a Thread card.
// Each story isolates one behaviour: the empty state, role-less output,
// empty parts, and JSON blocks (copy, Show more, initial key expansion).
const meta = {
	title: 'Pages/Traces/Trace Details/Span Messages',
	component: SpanMessages,
	args: { view: ThreadView.Formatted, span: makeSpan({}) },
	argTypes: {
		view: { control: 'inline-radio', options: Object.values(ThreadView) },
		span: { control: false },
	},
	decorators: [
		(Story): JSX.Element => (
			<div style={{ maxWidth: 720, padding: 24 }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof SpanMessages>;

export default meta;

type Story = StoryObj<typeof meta>;

/** No formatted messages: the dashed "no input or output" box. */
export const NoInputOrOutput: Story = {};

/** JSON view with no raw attributes: the same empty box. */
export const NoInputOrOutputJson: Story = {
	args: { view: ThreadView.Json },
};

/** Formatted view while only raw attributes exist: still the empty box. */
export const RawOnlyFormatted: Story = {
	args: { span: makeSpan({ attributes: rawAttributes }) },
};

/** An output message with no role keeps its Output badge. */
export const OutputWithoutRole: Story = {
	args: {
		span: makeSpan({
			formatted_output: [
				{
					parts: [{ type: 'text', content: 'Answer from a role-less message.' }],
					finish_reason: 'stop',
				},
			],
		}),
	},
};

/** Blank text, empty generic and an unknown part each render "No content". */
export const EmptyParts: Story = {
	args: {
		span: makeSpan({
			formatted_input: [
				{
					role: 'user',
					parts: [
						{ type: 'text', content: '   ' },
						{ type: 'generic', content: '' },
						{ type: 'unknown_kind' } as never,
					],
				},
			],
		}),
	},
};

/** Large tool-call JSON: keys closed, clamped behind Show more, with copy. */
export const LargeJsonPart: Story = {
	args: {
		span: makeSpan({
			formatted_output: [
				{
					role: 'assistant',
					parts: [
						{
							type: 'tool_call',
							id: 'call_1',
							name: 'get_weather',
							arguments: LARGE_ARGUMENTS,
						},
					],
					finish_reason: 'tool_call',
				},
			],
		}),
	},
};

/** The large tool-call JSON after Show more. */
export const LargeJsonPartExpanded: Story = {
	...LargeJsonPart,
	play: async ({ canvasElement }): Promise<void> => clickShowMore(canvasElement),
};

/** Small JSON part: no Show more, copy still available. */
export const SmallJsonPart: Story = {
	args: {
		span: makeSpan({
			formatted_output: [
				{
					role: 'assistant',
					parts: [
						{
							type: 'tool_call',
							id: 'call_2',
							name: 'get_time',
							arguments: { tz: 'UTC' },
						},
					],
				},
			],
		}),
	},
};

/** JSON tab: every key open, clamped behind Show more, with copy. */
export const JsonView: Story = {
	args: { view: ThreadView.Json, span: makeSpan({ attributes: rawAttributes }) },
};

/** The JSON tab after Show more. */
export const JsonViewExpanded: Story = {
	...JsonView,
	play: async ({ canvasElement }): Promise<void> => clickShowMore(canvasElement),
};
