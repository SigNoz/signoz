import {
	getListDashboardsForUserV2QueryKey,
	useListDashboardsForUserV2,
} from 'api/generated/services/dashboard';
import {
	getListRulesQueryKey,
	useListRules,
} from 'api/generated/services/rules';
import { useQueryService } from 'hooks/useQueryService';
import { render, screen, userEvent } from 'tests/test-utils';

import { useAIAssistantAnalyticsContext } from '../../../hooks/useAIAssistantAnalyticsContext';
import { useSpeechRecognition } from '../../../hooks/useSpeechRecognition';
import ChatInput from '../ChatInput';

jest.mock('api/generated/services/dashboard');
jest.mock('api/generated/services/rules');
jest.mock('hooks/useQueryService');
jest.mock('../../../hooks/useSpeechRecognition');
jest.mock('../../../hooks/useAIAssistantAnalyticsContext');

function getComposer(): HTMLTextAreaElement {
	return screen.getByPlaceholderText(/Ask anything/i) as HTMLTextAreaElement;
}

describe('ChatInput — @ mention trigger', () => {
	beforeEach(() => {
		jest
			.mocked(getListDashboardsForUserV2QueryKey)
			.mockReturnValue(['dashboards'] as unknown as ReturnType<
				typeof getListDashboardsForUserV2QueryKey
			>);
		jest.mocked(useListDashboardsForUserV2).mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: false,
		} as ReturnType<typeof useListDashboardsForUserV2>);
		jest
			.mocked(getListRulesQueryKey)
			.mockReturnValue(['rules'] as unknown as ReturnType<
				typeof getListRulesQueryKey
			>);
		jest.mocked(useListRules).mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: false,
		} as ReturnType<typeof useListRules>);
		jest.mocked(useQueryService).mockReturnValue({
			data: [],
			isLoading: false,
			isFetching: false,
			isError: false,
		} as unknown as ReturnType<typeof useQueryService>);
		jest.mocked(useSpeechRecognition).mockReturnValue({
			isListening: false,
			isSupported: false,
			permission: 'prompt',
			start: jest.fn(),
			discard: jest.fn(),
		} as unknown as ReturnType<typeof useSpeechRecognition>);
		jest.mocked(useAIAssistantAnalyticsContext).mockReturnValue({
			threadId: undefined,
			page: '/',
			mode: 'sidepane',
		} as unknown as ReturnType<typeof useAIAssistantAnalyticsContext>);
	});

	it('opens the context picker when @ starts a word', async () => {
		render(<ChatInput onSend={jest.fn()} />);

		await userEvent.type(getComposer(), 'check @');

		await expect(
			screen.findByPlaceholderText(/search dashboards/i),
		).resolves.toBeInTheDocument();
	});

	it('keeps typing an email without opening the context picker', async () => {
		render(<ChatInput onSend={jest.fn()} />);

		await userEvent.type(getComposer(), 'mail user@example.com');

		expect(getComposer()).toHaveValue('mail user@example.com');
		expect(
			screen.queryByPlaceholderText(/search dashboards/i),
		).not.toBeInTheDocument();
	});
});
