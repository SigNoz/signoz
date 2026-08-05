import { MemoryRouter } from 'react-router-dom';
// eslint-disable-next-line no-restricted-imports
import { fireEvent, render } from '@testing-library/react';
import { MessageContext } from 'api/ai-assistant/chat';
import { useAIAssistantStore } from 'container/AIAssistant/store/useAIAssistantStore';
import { VariantContext } from 'container/AIAssistant/VariantContext';

const CHIP_ID = 'recent-errors';
const CHIP_TEXT = 'Show me recent errors';

// Auto-derived page context that a normal (typed) send would attach. The chip
// send must forward the exact same array.
const mockAutoContexts: MessageContext[] = [
	{
		source: 'auto',
		type: 'dashboard',
		resourceId: 'dashboard-123',
		resourceName: 'Checkout dashboard',
	},
];

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

jest.mock('container/AIAssistant/getAutoContexts', () => ({
	getAutoContexts: jest.fn(() => mockAutoContexts),
}));

jest.mock('container/AIAssistant/hooks/useAIAssistantAnalyticsContext', () => ({
	normalizePage: (page: string): string => page,
	useAIAssistantAnalyticsContext: (): unknown => ({ threadId: 'thread-1' }),
}));

// ChatInput is heavy and irrelevant here — the chip path lives entirely in the
// empty state. Provide a lightweight stub plus the `autoContextKey` named export
// ConversationView imports for its dismissed-context filter.
jest.mock('container/AIAssistant/components/ChatInput', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="chat-input" />,
	autoContextKey: (): string => '',
}));

jest.mock('container/AIAssistant/components/ConversationSkeleton', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="skeleton" />,
}));

// VirtualizedMessages renders the real empty-state chips; stub only its
// never-rendered-in-empty-state children and the virtual list.
jest.mock('components/Noz/Noz', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="noz" />,
}));

jest.mock('container/AIAssistant/components/MessageBubble', () => ({
	__esModule: true,
	default: (): null => null,
}));

jest.mock('container/AIAssistant/components/StreamingMessage', () => ({
	__esModule: true,
	default: (): null => null,
}));

jest.mock('react-virtuoso', () => ({
	__esModule: true,
	Virtuoso: (): null => null,
}));

jest.mock(
	'container/AIAssistant/components/VirtualizedMessages/useEmptyStateChips',
	() => ({
		useEmptyStateChips: (): { chips: { id: string; text: string }[] } => ({
			chips: [{ id: CHIP_ID, text: CHIP_TEXT }],
		}),
	}),
);

// eslint-disable-next-line import/first
import ConversationView from '../ConversationView';

const CONVERSATION_ID = 'conv-1';

function renderView(variant: 'panel' | 'page' | 'modal'): {
	getByTestId: (id: string) => HTMLElement;
} {
	return render(
		<MemoryRouter initialEntries={['/dashboard/dashboard-123']}>
			<VariantContext.Provider value={variant}>
				<ConversationView conversationId={CONVERSATION_ID} />
			</VariantContext.Provider>
		</MemoryRouter>,
	);
}

describe('ConversationView — empty-state chip context', () => {
	let sendMessage: jest.Mock;

	beforeEach(() => {
		jest.clearAllMocks();
		sendMessage = jest.fn();
		useAIAssistantStore.setState({
			conversations: {
				[CONVERSATION_ID]: {
					id: CONVERSATION_ID,
					messages: [],
					createdAt: 1,
					updatedAt: 1,
				},
			},
			streams: {},
			activeConversationId: CONVERSATION_ID,
			isLoadingThread: false,
			sendMessage,
		} as unknown as Partial<ReturnType<typeof useAIAssistantStore.getState>>);
	});

	it('forwards the page auto-contexts when a chip is clicked (embedded variant)', () => {
		const { getByTestId } = renderView('panel');

		fireEvent.click(getByTestId(`empty-state-chip-${CHIP_ID}`));

		// The chip send must carry the same auto-contexts a typed message would.
		expect(sendMessage).toHaveBeenCalledTimes(1);
		expect(sendMessage).toHaveBeenCalledWith(
			CHIP_TEXT,
			undefined,
			mockAutoContexts,
		);
	});

	it('sends undefined contexts on the standalone page (no page context to attach)', () => {
		const { getByTestId } = renderView('page');

		fireEvent.click(getByTestId(`empty-state-chip-${CHIP_ID}`));

		expect(sendMessage).toHaveBeenCalledTimes(1);
		expect(sendMessage).toHaveBeenCalledWith(CHIP_TEXT, undefined, undefined);
	});
});
