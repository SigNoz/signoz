import { changelog } from 'components/ChangelogModal/stories/__story_mockdata__/changelog';
import { useAIAssistantStore } from 'container/AIAssistant/store/useAIAssistantStore';
import { useIsAIAssistantEnabled } from 'hooks/useIsAIAssistantEnabled';
import { screen } from 'tests/test-utils';

import { flushPendingImports, renderAppLayout } from './testUtils';

jest.mock('utils/lazyWithRetries', () => ({
	lazyRetry: (componentImport: () => Promise<unknown>): Promise<unknown> =>
		componentImport(),
}));

jest.mock('hooks/useIsAIAssistantEnabled', () => ({
	useIsAIAssistantEnabled: jest.fn(),
}));

jest.mock('container/AIAssistant/AIAssistantPanel', () => {
	throw new Error('Failed to fetch dynamically imported module');
});

jest.mock('container/AIAssistant/AIAssistantModal', () => {
	throw new Error('Failed to fetch dynamically imported module');
});

jest.mock('components/ChangelogModal/ChangelogModal', () => {
	throw new Error('Failed to fetch dynamically imported module');
});

describe('AppLayout when a lazy overlay fails to download', () => {
	beforeEach(() => {
		jest.spyOn(console, 'error').mockImplementation(() => {});
		useAIAssistantStore.setState({ fetchThreads: jest.fn() });
	});

	afterEach(() => {
		jest.mocked(console.error).mockRestore();
	});

	it('keeps the page when the assistant download fails', async () => {
		jest.mocked(useIsAIAssistantEnabled).mockReturnValue(true);

		renderAppLayout({ isLoggedIn: true, changelog, showChangelogModal: false });
		await flushPendingImports();

		expect(screen.getByTestId('page-content')).toHaveTextContent('Page content');
	});

	it('keeps the page when the changelog download fails', async () => {
		jest.mocked(useIsAIAssistantEnabled).mockReturnValue(false);

		renderAppLayout({ isLoggedIn: true, changelog, showChangelogModal: true });
		await flushPendingImports();

		expect(screen.getByTestId('page-content')).toHaveTextContent('Page content');
	});
});
