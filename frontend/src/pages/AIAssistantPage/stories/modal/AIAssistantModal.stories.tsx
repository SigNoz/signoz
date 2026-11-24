import type { Meta, StoryObj } from '@storybook/react-vite';
import ROUTES from 'constants/routes';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';

import {
	type AIAssistantArgs,
	aiAssistantModalMocks,
	longActionTooltipHandlers,
} from '../AIAssistantPage.stories.mocks';
import {
	BRIEF,
	COMMITMENTS,
	INTERACTIVE,
	QUESTIONS,
} from '../__story_mockdata__/aiAssistant';
import {
	copyConversationLink,
	expandActivity,
	expandSingleStep,
	openApprovalDiff,
	openClarificationSelect,
	openContextPicker,
	openConversationActions,
	openHistory,
	openLiveSteps,
	openNegativeFeedback,
	pickContexts,
	renameConversation,
	scrollToTop,
	typeDraft,
} from '../__story_mockdata__/aiAssistantModal.play';

/** A page with nothing on it, so the modal opens over the bare shell. */
function EmptyPage(): JSX.Element {
	return <div />;
}

const pageStory = storyMocks(aiAssistantModalMocks, {
	route: ROUTES.HOME,
	layout: 'app',
});

/**
 * Noz in the modal ⌘J opens over any page: the thread, composer and cards of the
 * Noz page, with the conversation list behind the header's History. The header
 * also starts a conversation, opens the full page, and minimizes to the panel.
 *
 * Route: every page inside the app shell; these stories use `/home`.
 */
const meta = {
	title: 'Pages/Noz/Modal',
	tags: ['play'],
	component: EmptyPage,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<AIAssistantArgs>;

export default meta;

type Story = StoryObj<AIAssistantArgs>;

/** A thread mid-investigation, titled in the header. */
export const Default: Story = {};

/** A fresh ⌘J: the suggested prompts, and no title in the header yet. */
export const NewConversation: Story = {
	args: { conversation: false, history: 0, archived: 0 },
};

/** The conversation list in place of the thread, as History shows it. */
export const History: Story = {
	play: openHistory,
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

/** Reopening the modal on a thread that has not come back yet. */
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

/** Renaming a thread from History: the chromeless title input the row swaps in. */
export const ConversationRename: Story = {
	play: renameConversation,
};

/** What a conversation row in History offers: rename, a link to it, and archiving. */
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

/** "Copy link" on a conversation row in History, which toasts once the link is copied. */
export const ConversationLinkCopiedToast: Story = {
	play: copyConversationLink,
};

/**
 * Every tooltip the modal carries, held open at once: the header's history, new
 * conversation, full screen, minimize and close, the composer's add context and
 * send, the copy chip under each user message, the copy, rate and regenerate bar
 * under each answer, the code block's copy, and the action chip's description.
 */
export const Tooltips: Story = {
	args: { tooltipsOpen: true },
	parameters: { msw: { handlers: longActionTooltipHandlers } },
};

/**
 * The approval diff dialog's copy tooltips, one per side of the split view, with
 * the card's own expand held open behind it.
 */
export const TooltipsInApprovalDiff: Story = {
	args: { tooltipsOpen: true, agent: 'awaiting-approval', contents: BRIEF },
	play: openApprovalDiff,
};
