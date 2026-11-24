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

export const Default: Story = {};

export const NewConversation: Story = {
	args: { conversation: false, history: 0, archived: 0 },
};

export const History: Story = {
	play: openHistory,
};

export const QuestionBlocks: Story = {
	args: { contents: QUESTIONS },
};

export const ActionBlocks: Story = {
	args: { contents: COMMITMENTS },
};

export const AnsweredBlocks: Story = {
	args: { contents: INTERACTIVE, answered: true },
};

export const Thinking: Story = {
	args: { agent: 'thinking', contents: BRIEF },
};

export const Streaming: Story = {
	args: { agent: 'streaming', contents: BRIEF },
};

export const StreamingSteps: Story = {
	args: { agent: 'streaming', contents: BRIEF },
	play: openLiveSteps,
};

export const DraftWhileStreaming: Story = {
	args: { agent: 'streaming', contents: BRIEF },
	play: typeDraft,
};

export const ScrolledUp: Story = {
	args: { agent: 'streaming' },
	play: scrollToTop,
};

export const AwaitingApproval: Story = {
	args: { agent: 'awaiting-approval', contents: BRIEF },
};

export const AwaitingDeleteApproval: Story = {
	args: { agent: 'awaiting-approval', approvalDiff: false, contents: BRIEF },
};

export const AwaitingClarification: Story = {
	args: { agent: 'awaiting-clarification', contents: BRIEF },
};

export const ClarificationSelectOpen: Story = {
	args: { agent: 'awaiting-clarification', contents: BRIEF },
	play: openClarificationSelect,
};

export const LoadingThread: Story = {
	args: { dataState: 'loading' },
};

export const ActivityExpanded: Story = {
	play: expandActivity,
};

export const SingleStep: Story = {
	args: { contents: ['one-step'] },
	play: expandSingleStep,
};

export const ApprovalDiff: Story = {
	args: { agent: 'awaiting-approval', contents: BRIEF },
	play: openApprovalDiff,
};

export const NegativeFeedback: Story = {
	play: openNegativeFeedback,
};

export const ConversationRename: Story = {
	play: renameConversation,
};

export const ConversationActions: Story = {
	play: openConversationActions,
};

export const AddContext: Story = {
	play: openContextPicker,
};

export const PickedContexts: Story = {
	play: pickContexts,
};

export const SentContexts: Story = {
	args: { contents: ['contexts'] },
};

export const ConversationLinkCopiedToast: Story = {
	play: copyConversationLink,
};

export const Tooltips: Story = {
	args: { tooltipsOpen: true },
	parameters: { msw: { handlers: longActionTooltipHandlers } },
};

export const TooltipsInApprovalDiff: Story = {
	args: { tooltipsOpen: true, agent: 'awaiting-approval', contents: BRIEF },
	play: openApprovalDiff,
};
