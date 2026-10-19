import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import TraceDetailsV3 from '../../index';
import { ThreadView } from '../types';
import {
	traceThreadMocks,
	untilThreadLoaded,
} from './TraceDetailsThread.stories.mocks';

type TraceThreadArgs = PageStoryArgs<typeof traceThreadMocks>;

const pageStory = storyMocks(traceThreadMocks, { layout: 'app' });

/**
 * The Thread tab of a trace: its AI spans as cards of input and output
 * messages, in OTel GenAI parts, with a Formatted / JSON switch, tool results
 * linking back to their calls, and the span panel a card opens. Driven by
 * `GET /api/v1/traces/{id}/thread`, paged by cursor.
 *
 * Route: `/trace/:id?tab=thread`, with `view` and `spanId` from the controls.
 */
const meta = {
	title: 'Pages/Traces/Trace Details/Thread',
	tags: ['play'],
	component: TraceDetailsV3,
	// The page reads the trace id out of the pathname, so it renders under its
	// own route rather than being mounted on its own.
	render: (): JSX.Element => (
		<Route path={ROUTES.TRACE_DETAIL} component={TraceDetailsV3} />
	),
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<TraceThreadArgs>;

export default meta;

type Story = StoryObj<TraceThreadArgs>;

const clickAll = async (
	canvasElement: HTMLElement,
	testId: string,
): Promise<void> => {
	const toggles = await within(canvasElement).findAllByTestId(
		testId,
		undefined,
		untilThreadLoaded,
	);

	await toggles.reduce(
		(previous, toggle) => previous.then(() => userEvent.click(toggle)),
		Promise.resolve(),
	);
};

/**
 * A tool-calling conversation: the model reasons and calls a weather tool, the
 * tool span returns its result, and a second call answers in markdown. The
 * system prompt is collapsed and each tool result links back to its call.
 */
export const Default: Story = {};

/** The same conversation as the raw `gen_ai.*.messages` JSON of each span. */
export const Json: Story = {
	args: { view: ThreadView.Json },
};

/** The system prompt opened from its collapsed line. */
export const SystemPromptExpanded: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await clickAll(canvasElement, 'ai-message-system-toggle');
	},
};

/**
 * One card per message part type: markdown and long text, reasoning with and
 * without content, compaction, tool calls with object, truncated and missing
 * arguments, inline and block tool results (one whose call is not in its span),
 * server tool calls (one sharing its id with a client call), blob / file / uri
 * media, and generic parts.
 */
export const EveryPart: Story = {
	args: { scenario: 'every-part' },
};

/** Every part type with reasoning, compaction and long text expanded. */
export const EveryPartExpanded: Story = {
	args: { scenario: 'every-part' },
	play: async ({ canvasElement }): Promise<void> => {
		await clickAll(canvasElement, 'ai-message-thinking-toggle');
		await clickAll(canvasElement, 'ai-message-compaction-toggle');
		await clickAll(canvasElement, 'ai-message-show-more');
	},
};

/** Every part type as raw JSON. */
export const EveryPartJson: Story = {
	args: { scenario: 'every-part', view: ThreadView.Json },
};

/** A tool result's link followed to its call in the same span, highlighted. */
export const ToolCallLinkFollowed: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const [link] = await within(canvasElement).findAllByTestId(
			'ai-tool-result-link',
			undefined,
			untilThreadLoaded,
		);
		await userEvent.click(link);
	},
};

/**
 * Every role (system and developer collapsed, a message with no role rendered
 * headerless, one with no parts) and every finish reason: `stop` and
 * `tool_call` green, `length` and `content_filter` amber, `error` red and
 * `compaction` blue.
 */
export const RolesAndFinishReasons: Story = {
	args: { scenario: 'roles-and-finish-reasons' },
};

/**
 * Spans the backend could not format: messages rebuilt from the raw
 * attributes, and a tool span with none at all.
 */
export const RawAttributes: Story = {
	args: { scenario: 'raw-attributes' },
};

/** A trace with no AI spans, and the link to the LLM observability docs. */
export const NoAiSpans: Story = {
	args: { scenario: 'no-ai-spans' },
};

/** The thread mid-fetch. */
export const Loading: Story = {
	args: { dataState: 'loading' },
};

/** Opened from a span link: scrolled to that span, with its panel open. */
export const OpenedOnSpan: Story = {
	args: { anchor: 'span-in-thread' },
};

/**
 * Opened on a span the backend dropped for having no messages: the rest of the
 * thread under a notice.
 */
export const OpenedOnSpanWithoutMessages: Story = {
	args: { anchor: 'span-without-messages' },
};

/** Opened on a span that is not in the trace, with the way back and to the thread. */
export const SpanNotFound: Story = {
	args: { anchor: 'span-not-found' },
	// The deliberate 404 is the state under test.
	parameters: { allowConsoleErrors: true },
};

/** The first page shown and the next one still loading below it. */
export const NextPageLoading: Story = {
	args: { scenario: 'every-part', paging: 'next-page-pending' },
};
