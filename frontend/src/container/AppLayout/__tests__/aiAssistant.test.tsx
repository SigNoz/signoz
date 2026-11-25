import { useAIAssistantStore } from 'container/AIAssistant/store/useAIAssistantStore';
import { useIsAIAssistantEnabled } from 'hooks/useIsAIAssistantEnabled';
import { screen } from 'tests/test-utils';

import { flushPendingImports, renderAppLayout } from './testUtils';

const mockPanelModuleLoaded = jest.fn();
const mockModalModuleLoaded = jest.fn();

jest.mock('hooks/useIsAIAssistantEnabled', () => ({
	useIsAIAssistantEnabled: jest.fn(),
}));

jest.mock('container/AIAssistant/AIAssistantPanel', () => {
	mockPanelModuleLoaded();
	return {
		__esModule: true,
		default: (): JSX.Element => <div data-testid="ai-assistant-panel" />,
	};
});

jest.mock('container/AIAssistant/AIAssistantModal', () => {
	mockModalModuleLoaded();
	return {
		__esModule: true,
		default: (): JSX.Element => <div data-testid="ai-assistant-modal" />,
	};
});

describe('AppLayout AI assistant', () => {
	beforeEach(() => {
		mockPanelModuleLoaded.mockClear();
		mockModalModuleLoaded.mockClear();
		useAIAssistantStore.setState({ fetchThreads: jest.fn() });
	});

	it('does not load the assistant for users who do not have it', async () => {
		jest.mocked(useIsAIAssistantEnabled).mockReturnValue(false);

		renderAppLayout({ isLoggedIn: true });
		await flushPendingImports();

		expect(screen.getByTestId('page-content')).toBeInTheDocument();
		expect(screen.queryByTestId('ai-assistant-panel')).not.toBeInTheDocument();
		expect(mockPanelModuleLoaded).not.toHaveBeenCalled();
		expect(mockModalModuleLoaded).not.toHaveBeenCalled();
	});

	it('loads the assistant panel and modal for users who have it', async () => {
		jest.mocked(useIsAIAssistantEnabled).mockReturnValue(true);

		renderAppLayout({ isLoggedIn: true });

		expect(screen.getByTestId('page-content')).toBeInTheDocument();
		await expect(
			screen.findByTestId('ai-assistant-panel'),
		).resolves.toBeInTheDocument();
		expect(screen.getByTestId('ai-assistant-modal')).toBeInTheDocument();
	});
});
