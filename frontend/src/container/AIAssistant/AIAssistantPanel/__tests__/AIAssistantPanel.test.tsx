import { useAIAssistantOpenConversationsStore } from 'container/AIAssistant/store/useAIAssistantOpenConversationsStore';
import { render, screen, userEvent } from 'tests/test-utils';

import { useAIAssistantStore } from '../../store/useAIAssistantStore';
import AIAssistantPanel from '../AIAssistantPanel';

jest.mock('../../ConversationView', () => ({
	__esModule: true,
	default: (): JSX.Element => <div />,
}));

describe('AIAssistantPanel', () => {
	beforeEach(() => {
		useAIAssistantStore.setState((s) => {
			s.conversations = {
				c1: { id: 'c1', threadId: 't1', messages: [], createdAt: 0 },
			};
			s.activeConversationId = 'c1';
			s.isDrawerOpen = true;
		});
		useAIAssistantOpenConversationsStore.setState({ threadIds: ['t0', 't1'] });
	});

	it('minimizes to the strip, keeping the chat as a tab', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<AIAssistantPanel />);

		await user.click(screen.getByTestId('ai-assistant-panel-minimize'));

		expect(
			screen.queryByTestId('ai-assistant-panel-close'),
		).not.toBeInTheDocument();
		expect(
			useAIAssistantOpenConversationsStore.getState().threadIds,
		).toStrictEqual(['t0', 't1']);
	});

	it('closes the chat, taking its tab out of the strip', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<AIAssistantPanel />);

		await user.click(screen.getByTestId('ai-assistant-panel-close'));

		expect(
			screen.queryByTestId('ai-assistant-panel-close'),
		).not.toBeInTheDocument();
		expect(
			useAIAssistantOpenConversationsStore.getState().threadIds,
		).toStrictEqual(['t0']);
	});
});
