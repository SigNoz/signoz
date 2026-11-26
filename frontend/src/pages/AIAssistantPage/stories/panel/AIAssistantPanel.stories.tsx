import type { Meta, StoryObj } from '@storybook/react-vite';
import ROUTES from 'constants/routes';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';

import {
	type AIAssistantArgs,
	aiAssistantMocks,
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
	openPanel,
	pickContexts,
	renameConversation,
	scrollToTop,
	typeDraft,
} from '../__story_mockdata__/aiAssistantPanel.play';

function EmptyPage(): JSX.Element {
	return <div />;
}

const pageStory = storyMocks(aiAssistantMocks, {
	route: ROUTES.HOME,
	layout: 'app',
});

/**
 * Noz in the floating panel the bottom strip's Ask Noz opens beside any page: the
 * thread, composer and cards of the Noz page at panel width, with the
 * conversation list behind the header's History. Every story opens it from Ask
 * Noz.
 *
 * Route: every page inside the app shell; these stories use `/home`.
 */
const meta = {
	title: 'Pages/Noz/Panel',
	tags: ['play'],
	component: EmptyPage,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<AIAssistantArgs>;

export default meta;

type Story = StoryObj<AIAssistantArgs>;

export const Default: Story = {
	play: openPanel,
};

export const NewConversation: Story = {
	args: { conversation: false, history: 0, archived: 0 },
	play: openPanel,
};

export const History: Story = {
	play: openHistory,
};

export const QuestionBlocks: Story = {
	args: { contents: QUESTIONS },
	play: openPanel,
};

export const ActionBlocks: Story = {
	args: { contents: COMMITMENTS },
	play: openPanel,
};

export const AnsweredBlocks: Story = {
	args: { contents: INTERACTIVE, answered: true },
	play: openPanel,
};

export const Thinking: Story = {
	args: { agent: 'thinking', contents: BRIEF },
	play: openPanel,
};

export const Streaming: Story = {
	args: { agent: 'streaming', contents: BRIEF },
	play: openPanel,
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
	play: openPanel,
};

export const AwaitingDeleteApproval: Story = {
	args: { agent: 'awaiting-approval', approvalDiff: false, contents: BRIEF },
	play: openPanel,
};

export const AwaitingClarification: Story = {
	args: { agent: 'awaiting-clarification', contents: BRIEF },
	play: openPanel,
};

export const ClarificationSelectOpen: Story = {
	args: { agent: 'awaiting-clarification', contents: BRIEF },
	play: openClarificationSelect,
};

export const LoadingThread: Story = {
	args: { dataState: 'loading' },
	play: openPanel,
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
	play: openPanel,
};

export const ConversationLinkCopiedToast: Story = {
	play: copyConversationLink,
};

export const Tooltips: Story = {
	args: { tooltipsOpen: true },
	parameters: { msw: { handlers: longActionTooltipHandlers } },
	play: openPanel,
};

export const TooltipsInApprovalDiff: Story = {
	args: { tooltipsOpen: true, agent: 'awaiting-approval', contents: BRIEF },
	play: openApprovalDiff,
};
