import { useAIAssistantStore } from 'container/AIAssistant/store/useAIAssistantStore';
import type {
	Conversation,
	ConversationStreamState,
} from 'container/AIAssistant/types';
import { render, screen } from 'tests/test-utils';

import ConversationItem from '../ConversationItem';

const initialState = useAIAssistantStore.getState();

const conversation: Conversation = {
	id: 'a',
	threadId: 'a',
	title: 'Checkout p99',
	messages: [],
	createdAt: 0,
};

const streaming: ConversationStreamState = {
	isStreaming: true,
	streamingContent: '',
	streamingStatus: 'thinking',
	streamingEvents: [],
	streamingMessageId: null,
	streamingActions: null,
	pendingApproval: null,
	pendingClarification: null,
	startedAt: 0,
};

const renderRow = (): void => {
	render(
		<ConversationItem
			conversation={conversation}
			isActive={false}
			onSelect={jest.fn()}
			onRename={jest.fn()}
			onArchive={jest.fn()}
			onRestore={jest.fn()}
		/>,
	);
};

describe('ConversationItem', () => {
	afterEach(() => {
		useAIAssistantStore.setState(initialState, true);
	});

	it('marks a reply the user has not seen with the blue dot', () => {
		useAIAssistantStore.setState({ unreadReplyIds: ['a'] });

		renderRow();

		expect(screen.getByTestId('ai-conversation-a-dot')).toHaveAttribute(
			'data-state',
			'unread',
		);
		expect(screen.getByTestId('ai-conversation-a')).toHaveAttribute(
			'aria-label',
			'Noz replied in Checkout p99',
		);
	});

	it('shows replying over unread while a new reply streams', () => {
		useAIAssistantStore.setState({
			unreadReplyIds: ['a'],
			streams: { a: streaming },
		});

		renderRow();

		expect(screen.getByTestId('ai-conversation-a-dot')).toHaveAttribute(
			'data-state',
			'replying',
		);
	});

	it('has no dot without a reply to show', () => {
		renderRow();

		expect(screen.getByTestId('ai-conversation-a-dot')).not.toHaveAttribute(
			'data-state',
		);
		expect(screen.getByTestId('ai-conversation-a')).not.toHaveAttribute(
			'aria-label',
		);
	});
});
