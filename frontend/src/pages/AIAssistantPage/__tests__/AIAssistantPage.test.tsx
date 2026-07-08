import { MemoryRouter, Route } from 'react-router-dom';
// eslint-disable-next-line no-restricted-imports
import { render } from '@testing-library/react';
import ROUTES from 'constants/routes';
import { useAIAssistantStore } from 'container/AIAssistant/store/useAIAssistantStore';

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

jest.mock('container/AIAssistant/ConversationView', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="conversation-view" />,
}));

jest.mock('container/AIAssistant/components/ConversationsList', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="conversations-list" />,
}));

jest.mock('components/Noz/Noz', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="noz" />,
}));

jest.mock('container/AIAssistant/hooks/useAIAssistantAnalyticsContext', () => ({
	normalizePage: (page: string): string => page,
	useAIAssistantAnalyticsContext: (): unknown => ({ mode: 'page' }),
}));

// eslint-disable-next-line import/first
import AIAssistantPage from '../AIAssistantPage';

function renderAt(entry: string): { unmount: () => void } {
	return render(
		<MemoryRouter initialEntries={[entry]}>
			<Route
				exact
				path={[ROUTES.AI_ASSISTANT_BASE, ROUTES.AI_ASSISTANT]}
				component={AIAssistantPage}
			/>
		</MemoryRouter>,
	);
}

function renderAtBase(): { unmount: () => void } {
	return renderAt(ROUTES.AI_ASSISTANT_BASE);
}

function conversationCount(): number {
	return Object.keys(useAIAssistantStore.getState().conversations).length;
}

function conversationIds(): string[] {
	return Object.keys(useAIAssistantStore.getState().conversations);
}

function activeId(): string | null {
	return useAIAssistantStore.getState().activeConversationId;
}

describe('AIAssistantPage', () => {
	beforeEach(() => {
		useAIAssistantStore.setState({
			conversations: {},
			streams: {},
			activeConversationId: null,
		});
	});

	it('opens exactly one conversation when navigating to /ai-assistant', () => {
		const { unmount } = renderAtBase();

		expect(conversationCount()).toBe(1);

		unmount();
	});

	it('does not stack a second conversation when the page remounts at the bare URL (route churn)', () => {
		// First mount at `/ai-assistant` creates one blank conversation and
		// redirects to `/ai-assistant/:id`.
		const { unmount } = renderAtBase();
		expect(conversationCount()).toBe(1);
		const firstId = conversationIds()[0];

		// Startup route-list churn unmounts and remounts the page while the URL
		// is momentarily back at the bare `/ai-assistant`. This previously
		// created a second blank conversation — now it reuses the first.
		unmount();
		const { unmount: unmount2 } = renderAtBase();

		expect(conversationCount()).toBe(1);
		// The surviving conversation is the original one, resumed — not a fresh mint.
		expect(conversationIds()).toStrictEqual([firstId]);
		expect(activeId()).toBe(firstId);

		unmount2();
	});

	it('activates the conversation named in the URL without creating a new one', () => {
		useAIAssistantStore.setState({
			conversations: {
				existing: {
					id: 'existing',
					messages: [],
					createdAt: 1,
					updatedAt: 1,
				},
			},
			streams: {},
			activeConversationId: null,
		});

		const { unmount } = renderAt(
			ROUTES.AI_ASSISTANT.replace(':conversationId', 'existing'),
		);

		expect(conversationCount()).toBe(1);
		expect(activeId()).toBe('existing');

		unmount();
	});

	it('resumes the active conversation on /ai-assistant/new instead of minting a new one', () => {
		// The sidenav only routes to `/ai-assistant/new` as a fallback, but if an
		// active conversation exists the page must resume it rather than spawn a
		// throwaway blank thread for the unknown "new" param.
		useAIAssistantStore.setState({
			conversations: {
				active: {
					id: 'active',
					messages: [],
					createdAt: 1,
					updatedAt: 1,
				},
			},
			streams: {},
			activeConversationId: 'active',
		});

		const { unmount } = renderAt(
			ROUTES.AI_ASSISTANT.replace(':conversationId', 'new'),
		);

		expect(conversationCount()).toBe(1);
		expect(conversationIds()).toStrictEqual(['active']);
		expect(activeId()).toBe('active');

		unmount();
	});

	it('resumes the persisted (hydrating) conversation during load instead of creating a second', () => {
		// Simulates `onRehydrateStorage` priming the persisted active
		// conversation as a hydrating placeholder before `fetchThreads` resolves.
		useAIAssistantStore.setState({
			conversations: {
				persisted: {
					id: 'persisted',
					messages: [],
					createdAt: 1,
					updatedAt: 1,
					isHydrating: true,
				},
			},
			streams: {},
			activeConversationId: 'persisted',
		});

		const { unmount } = renderAtBase();

		// Opening the bare URL must resume the persisted conversation, not mint a
		// throwaway blank alongside it (which flashed as a 2nd thread during load).
		expect(conversationCount()).toBe(1);
		expect(
			Object.keys(useAIAssistantStore.getState().conversations),
		).toStrictEqual(['persisted']);

		unmount();
	});
});
