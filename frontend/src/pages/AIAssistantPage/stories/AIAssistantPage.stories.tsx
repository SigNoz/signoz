import type { Meta, StoryObj } from '@storybook/react-vite';
import ROUTES from 'constants/routes';
import { renderAtRoute } from '@/storybook/renderAtRoute';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';

import AIAssistantPage from '../AIAssistantPage';
import {
	type AIAssistantArgs,
	aiAssistantMocks,
	longActionTooltipHandlers,
} from './AIAssistantPage.stories.mocks';
import {
	BRIEF,
	COMMITMENTS,
	INTERACTIVE,
	QUESTIONS,
} from './__story_mockdata__/aiAssistant';
import {
	copyConversationLink,
	expandActivity,
	expandSingleStep,
	openApprovalDiff,
	openClarificationSelect,
	openContextPicker,
	openConversationActions,
	openLiveSteps,
	openNegativeFeedback,
	pickContexts,
	renameConversation,
	scrollToTop,
	typeDraft,
} from './__story_mockdata__/aiAssistant.play';

const pageStory = storyMocks(aiAssistantMocks, { layout: 'app' });

/**
 * Noz, the assistant: a thread of messages over the workspace's telemetry, tool
 * calls and the artefacts they produce rendered inline, and the thread list beside
 * it. The answer arrives as SSE, so it streams inside the story.
 *
 * Route: `/ai-assistant/:conversationId`.
 */
const meta = {
	title: 'Pages/Noz/Overview',
	tags: ['play'],
	component: AIAssistantPage,
	// The conversation id is in the pathname, so the page renders under its own
	// route rather than being mounted on its own.
	render: renderAtRoute(
		[ROUTES.AI_ASSISTANT_BASE, ROUTES.AI_ASSISTANT],
		AIAssistantPage,
	),
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<AIAssistantArgs>;

export default meta;

type Story = StoryObj<AIAssistantArgs>;

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

/** Just sent, with nothing back yet: the reply is one live Thinking… step. */
export const Thinking: Story = {
	args: { agent: 'thinking', contents: BRIEF },
};

/**
 * Mid-answer: steps already done, the text so far, and the running step named
 * on a shimmering row. The input takes a draft; sending waits for the reply.
 */
export const Streaming: Story = {
	args: { agent: 'streaming', contents: BRIEF },
};

/** The running reply's steps opened: a timeline whose newest step shimmers. */
export const StreamingSteps: Story = {
	args: { agent: 'streaming', contents: BRIEF },
	play: openLiveSteps,
};

/** The next question drafted while Noz still replies, with Stop in place of Send. */
export const DraftWhileStreaming: Story = {
	args: { agent: 'streaming', contents: BRIEF },
	play: typeDraft,
};

/** Scrolled up while Noz replies: a shimmering Latest pill leads back to the end. */
export const ScrolledUp: Story = {
	args: { agent: 'streaming' },
	play: scrollToTop,
};

/** A change the agent will not make until the user reads the diff and approves. */
export const AwaitingApproval: Story = {
	args: { agent: 'awaiting-approval', contents: BRIEF },
};

/** The agent asking for the details it needs, one field per detail. */
export const AwaitingClarification: Story = {
	args: { agent: 'awaiting-clarification', contents: BRIEF },
};

/** The severity select open, including the free-text option the new Select renders. */
export const ClarificationSelectOpen: Story = {
	args: { agent: 'awaiting-clarification', contents: BRIEF },
	play: openClarificationSelect,
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
	play: expandActivity,
};

/** An answer that took one step: its row names the step and opens to its input and output, with no timeline. */
export const SingleStep: Story = {
	args: { contents: ['one-step'] },
	play: expandSingleStep,
};

/** The approval diff at full size, before against after. */
export const ApprovalDiff: Story = {
	args: { agent: 'awaiting-approval', contents: BRIEF },
	play: openApprovalDiff,
};

/** The comment box a thumbs down opens, which a thumbs up does not. */
export const NegativeFeedback: Story = {
	play: openNegativeFeedback,
};

/** Renaming a thread: the chromeless title input the row swaps in. */
export const ConversationRename: Story = {
	play: renameConversation,
};

/** What a conversation row offers: rename, a link to it, and archiving. */
export const ConversationActions: Story = {
	play: openConversationActions,
};

/**
 * The composer's context picker: the dashboards, alerts and services a question
 * can be pinned to.
 */
export const AddContext: Story = {
	play: openContextPicker,
};

/** A dashboard and a service picked, as pills over the input; focus shows a pill's remove. */
export const PickedContexts: Story = {
	play: pickContexts,
};

/** A question sent with picked contexts, which sit under it as added to context. */
export const SentContexts: Story = {
	args: { contents: ['contexts'] },
};

/** "Copy link" on a conversation row, which toasts once the link is copied. */
export const ConversationLinkCopiedToast: Story = {
	play: copyConversationLink,
};

/**
 * Every tooltip the thread carries, held open at once: the composer's add context
 * and send buttons, the sidebar's new conversation, the copy chip under each user
 * message, the copy, rate and regenerate bar under each answer, the code block's
 * copy, and the action chip's own description.
 */
export const Tooltips: Story = {
	args: { tooltipsOpen: true },
	parameters: { msw: { handlers: longActionTooltipHandlers } },
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
