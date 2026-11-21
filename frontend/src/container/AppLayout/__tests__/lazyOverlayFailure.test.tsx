import { HelmetProvider } from 'react-helmet-async';
import { changelog } from 'components/ChangelogModal/stories/__story_mockdata__/changelog';
import { useAIAssistantStore } from 'container/AIAssistant/store/useAIAssistantStore';
import { useIsAIAssistantEnabled } from 'hooks/useIsAIAssistantEnabled';
import { CmdKProvider } from 'providers/cmdKProvider';
import { act, render, screen } from 'tests/test-utils';

import AppLayout from '../index';

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

async function flushPendingImports(): Promise<void> {
	await act(async () => {
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});
	});
}

function renderAppLayout(showChangelogModal: boolean): void {
	render(
		<HelmetProvider>
			<CmdKProvider>
				<AppLayout>
					<div data-testid="page-content">Page content</div>
				</AppLayout>
			</CmdKProvider>
		</HelmetProvider>,
		undefined,
		{
			appContextOverrides: {
				isLoggedIn: true,
				changelog,
				showChangelogModal,
			},
		},
	);
}

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

		renderAppLayout(false);
		await flushPendingImports();

		expect(screen.getByTestId('page-content')).toHaveTextContent('Page content');
	});

	it('keeps the page when the changelog download fails', async () => {
		jest.mocked(useIsAIAssistantEnabled).mockReturnValue(false);

		renderAppLayout(true);
		await flushPendingImports();

		expect(screen.getByTestId('page-content')).toHaveTextContent('Page content');
	});
});
