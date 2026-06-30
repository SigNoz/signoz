import { render, screen, userEvent, waitFor } from 'tests/test-utils';

// The prefill flow only depends on the context-picker data hooks resolving to
// empty lists (so the empty state renders) — mock them to skip real fetches.
jest.mock('hooks/dashboard/useGetAllDashboard', () => ({
	useGetAllDashboard: (): unknown => ({
		data: [],
		isLoading: false,
		isError: false,
	}),
}));

jest.mock('api/generated/services/rules', () => ({
	useListRules: (): unknown => ({ data: [], isLoading: false, isError: false }),
	getListRulesQueryKey: (): string[] => ['rules'],
}));

jest.mock('hooks/useQueryService', () => ({
	useQueryService: (): unknown => ({
		data: [],
		isLoading: false,
		isFetching: false,
		isError: false,
	}),
}));

// Irrelevant to the prefill flow and otherwise require browser APIs / extra
// context providers, so stub them out.
jest.mock('../../../hooks/useSpeechRecognition', () => ({
	useSpeechRecognition: (): unknown => ({
		isListening: false,
		isSupported: false,
		permission: 'prompt',
		start: jest.fn(),
		discard: jest.fn(),
	}),
}));

jest.mock('../../../hooks/useAIAssistantAnalyticsContext', () => ({
	useAIAssistantAnalyticsContext: (): unknown => ({
		threadId: undefined,
		page: '/',
		mode: 'sidepane',
	}),
}));

// eslint-disable-next-line import/first
import { TooltipProvider } from '@signozhq/ui/tooltip';
// eslint-disable-next-line import/first
import ChatInput from '../ChatInput';

function renderChatInput(): void {
	render(
		<TooltipProvider>
			<ChatInput onSend={jest.fn()} />
		</TooltipProvider>,
	);
}

function getComposer(): HTMLTextAreaElement {
	return screen.getByPlaceholderText(/Ask anything/i) as HTMLTextAreaElement;
}

describe('ChatInput — empty-state CTA prefill flow', () => {
	it('full-replaces existing prose with the query-seeded prompt and closes the picker', async () => {
		renderChatInput();

		// Pre-existing prose in the composer.
		await userEvent.type(getComposer(), 'show me something');

		// Open the picker and search for an entity that does not exist.
		await userEvent.click(screen.getByRole('button', { name: /add context/i }));
		await userEvent.type(
			await screen.findByPlaceholderText(/search dashboards/i),
			'chk',
		);

		const cta = await screen.findByTestId('ai-context-empty-cta-Dashboards');
		expect(cta).toHaveTextContent('Create a dashboard for "chk"');

		await userEvent.click(cta);

		// Full-replace is intentional: the prefill is a complete sentence, so the
		// prior "show me something" prose is discarded rather than producing
		// broken grammar (see handleContextPrefill). The query is seeded in.
		expect(getComposer().value).toBe('Create a dashboard for chk');

		// Picker closed → the empty-state CTA is gone.
		await waitFor(() =>
			expect(
				screen.queryByTestId('ai-context-empty-cta-Dashboards'),
			).not.toBeInTheDocument(),
		);
	});

	it('seeds only the prefix (with trailing space) in the onboarding case', async () => {
		renderChatInput();

		await userEvent.click(screen.getByRole('button', { name: /add context/i }));

		const cta = await screen.findByTestId('ai-context-empty-cta-Dashboards');
		expect(cta).toHaveTextContent('Ask me to create one');

		await userEvent.click(cta);

		expect(getComposer().value).toBe('Create a dashboard for ');
		await waitFor(() =>
			expect(
				screen.queryByTestId('ai-context-empty-cta-Dashboards'),
			).not.toBeInTheDocument(),
		);
	});
});
