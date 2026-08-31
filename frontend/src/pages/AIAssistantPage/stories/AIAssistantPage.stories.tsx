import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route } from 'react-router-dom';
import { AI_API_PATH } from 'api/AIAPIInstance';
import ROUTES from 'constants/routes';
import { rest } from 'msw';
import { screen, userEvent, waitFor, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import AIAssistantPage from '../AIAssistantPage';
import { aiAssistantMocks } from './AIAssistantPage.stories.mocks';
import {
	threadDetailResponse,
	type ThreadPart,
} from './__story_mockdata__/aiAssistant';

type AIAssistantArgs = PageStoryArgs<typeof aiAssistantMocks>;

const pageStory = storyMocks(aiAssistantMocks, { layout: 'app' });

/**
 * Noz, the assistant: a thread of messages over the workspace's telemetry, tool
 * calls and the artefacts they produce rendered inline, and the thread list beside
 * it. The answer arrives as SSE, so it streams inside the story.
 *
 * Route: `/ai-assistant/:conversationId`.
 */
const meta = {
	title: 'Pages/Noz',
	tags: ['play'],
	component: AIAssistantPage,
	// The conversation id is in the pathname, so the page renders under its own
	// route rather than being mounted on its own.
	render: (): JSX.Element => (
		<Route
			path={[ROUTES.AI_ASSISTANT_BASE, ROUTES.AI_ASSISTANT]}
			component={AIAssistantPage}
		/>
	),
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<AIAssistantArgs>;

export default meta;

type Story = StoryObj<AIAssistantArgs>;

/** The thread list resolves before the thread does, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

/**
 * Click something, and keep clicking until what it opens is on screen. The
 * message list remounts its items while it measures a freshly loaded thread, so
 * a single click can land on a row that is about to be replaced, taking the
 * state it just set with it.
 */
const clickUntil = async (
	find: () => Promise<HTMLElement>,
	opens: RegExp,
): Promise<void> => {
	await waitFor(async () => {
		await userEvent.click(await find());
		await screen.findByText(opens, undefined, { timeout: 1_000 });
	}, untilLoaded);
};

/** The blocks the agent renders as cards the user answers in place. */
const INTERACTIVE: ThreadPart[] = [
	'question',
	'checkboxes',
	'confirm',
	'suggested-action',
];

const QUESTIONS: ThreadPart[] = ['question', 'checkboxes'];

const COMMITMENTS: ThreadPart[] = ['confirm', 'suggested-action'];

/**
 * Two short exchanges and nothing else, so the state the story is about sits in
 * the first screen rather than under a scroll.
 */
const BRIEF: ThreadPart[] = [];

/** A thread mid-investigation, with the earlier ones beside it. */
export const Default: Story = {};

/** The first visit: the suggested prompts and nothing asked yet. */
export const NewConversation: Story = {
	args: { conversation: false, history: 0, archived: 0 },
};

/**
 * The cards the agent puts in the thread when it needs the user to pick: one
 * answer, or several.
 */
export const QuestionBlocks: Story = {
	args: { contents: QUESTIONS },
};

/**
 * The cards that ask the user to commit: a confirmation the agent acts on, and
 * a page action it will apply here.
 */
export const ActionBlocks: Story = {
	args: { contents: COMMITMENTS },
};

/** All four cards once the user has answered them, which the store remembers. */
export const AnsweredBlocks: Story = {
	args: { contents: INTERACTIVE, answered: true },
};

/**
 * Mid-answer: a step already done, the text so far, and a step still running
 * with the elapsed clock on it. The composer waits its turn.
 */
export const Streaming: Story = {
	args: { agent: 'streaming', contents: BRIEF },
};

/** A change the agent will not make until the user reads the diff and approves. */
export const AwaitingApproval: Story = {
	args: { agent: 'awaiting-approval', contents: BRIEF },
};

/** The agent asking for the details it needs, one field per detail. */
export const AwaitingClarification: Story = {
	args: { agent: 'awaiting-clarification', contents: BRIEF },
};

/** Reopening the page on a thread that has not come back yet. */
export const LoadingThread: Story = {
	args: { dataState: 'loading' },
};

/**
 * The steps behind an answer: what the agent thought, and each tool it called
 * with what went in and what came back.
 */
export const ActivityExpanded: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);

		await clickUntil(
			() => canvas.findByText(/worked through/i, undefined, untilLoaded),
			/compared checkout p99/i,
		);
		await clickUntil(
			() => canvas.findByText(/compared checkout p99/i, undefined, untilLoaded),
			/^Output$/,
		);
	},
};

/** Opens the approval card's diff dialog. */
const openApprovalDiff: NonNullable<Story['play']> = async ({
	canvasElement,
}) => {
	await clickUntil(
		() =>
			within(canvasElement).findByLabelText(
				/expand diff/i,
				undefined,
				untilLoaded,
			),
		/approval diff/i,
	);
};

/** The approval diff at full size, before against after. */
export const ApprovalDiff: Story = {
	args: { agent: 'awaiting-approval', contents: BRIEF },
	play: openApprovalDiff,
};

/** The comment box a thumbs down opens, which a thumbs up does not. */
export const NegativeFeedback: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await clickUntil(async () => {
			// Every assistant message carries the bar; only the last one shows it
			// without a hover.
			const bars = await within(canvasElement).findAllByLabelText(
				/bad response/i,
				undefined,
				untilLoaded,
			);

			return bars[bars.length - 1];
		}, /what went wrong/i);
	},
};

/** What a conversation row offers: rename, a link to it, and archiving. */
export const ConversationActions: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await clickUntil(async () => {
			const [actions] = await within(canvasElement).findAllByLabelText(
				/conversation actions/i,
				undefined,
				untilLoaded,
			);

			return actions;
		}, /copy link/i);
	},
};

/**
 * The composer's context picker: the dashboards, alerts and services a question
 * can be pinned to.
 */
export const AddContext: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await clickUntil(
			() =>
				within(canvasElement).findByRole(
					'button',
					{ name: /add context/i },
					untilLoaded,
				),
			/checkout overview/i,
		);
	},
};

const LONG_ACTION_TOOLTIP =
	'Opens the logs explorer on payment.svc.cluster.local:8080, filtered to the 429s it answered between 14:00 and 15:00, with the retry attempt and the upstream quota window already on the table.';

/**
 * An action chip's tooltip is the one text on the page the backend writes, and
 * the thread fixture keeps it to a line. This answers with the same turns and a
 * chip whose tooltip runs long, so the Thread contents, Interactive blocks
 * answered and Agent controls do not reach the story that uses it. Both bases
 * are covered because the assistant's host is empty while the global config
 * query is in flight, as the page's mocks module explains.
 */
const longActionTooltip = [
	`http://localhost${AI_API_PATH}/threads/:threadId`,
	'/threads/:threadId',
].map((path) =>
	rest.get(path, (_req, res, ctx) => {
		const thread = threadDetailResponse(aiAssistantMocks.args.contents, 'idle');

		return res(
			ctx.status(200),
			ctx.json({
				...thread,
				messages: thread.messages?.map((message) => ({
					...message,
					actions: message.actions?.map((action) =>
						action.tooltip ? { ...action, tooltip: LONG_ACTION_TOOLTIP } : action,
					),
				})),
			}),
		);
	}),
);

/**
 * Every tooltip the thread carries, held open at once: the composer's voice and
 * send buttons, the sidebar's new conversation, the copy chip under each user
 * message, the copy, rate and regenerate bar under each answer, the code block's
 * copy, and the action chip's own description.
 */
export const Tooltips: Story = {
	args: { tooltipsOpen: true },
	parameters: { msw: { handlers: longActionTooltip } },
};

/**
 * The approval diff dialog's copy tooltips, one per side of the split view, with
 * the card's own expand held open behind it. Switching the dialog to the unified
 * view replaces the pair with a single Copy diff.
 */
export const TooltipsInApprovalDiff: Story = {
	args: { tooltipsOpen: true, agent: 'awaiting-approval', contents: BRIEF },
	play: openApprovalDiff,
};
