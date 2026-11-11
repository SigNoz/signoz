import { type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { VirtuosoMockContext } from 'react-virtuoso';
import {
	act,
	render,
	RenderResult,
	screen,
	waitFor,
} from '@testing-library/react';
import type userEvent from '@testing-library/user-event';
import { EditorView } from '@uiw/react-codemirror';
import ListAlertRules from 'container/ListAlertRules';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { AppContext } from 'providers/App/App';
import TimezoneProvider from 'providers/Timezone';
import { onNuqsUrlUpdate, resetNuqsState } from 'tests/nuqs-helpers';
import { TestRouter } from 'tests/router';
import { getAppContextMock } from 'tests/test-utils';
import type { RestHandler } from 'msw';
import { server } from 'mocks-server/server';
import { setupAuthzAdmin } from 'lib/authz/utils/authz-test-utils';

// NuqsTestingAdapter resets its update queue on every render, not only on mount,
// dropping writes queued just before it re-renders.
function UrlAdapter({
	searchParams,
	children,
}: {
	searchParams: string;
	children: ReactNode;
}): JSX.Element {
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);
	return (
		<NuqsTestingAdapter
			searchParams={searchParams}
			onUrlUpdate={onNuqsUrlUpdate}
			rateLimitFactor={0}
			resetUrlUpdateQueueOnMount={!mounted}
			hasMemory
		>
			{children}
		</NuqsTestingAdapter>
	);
}

interface RenderOptions {
	role?: string;
	initialRoute?: string;
	/** Answers the permission checks; grants everything by default. */
	authz?: RestHandler;
}

export function renderListAlertRules(
	options: RenderOptions = {},
): RenderResult {
	const { role = 'ADMIN', initialRoute = '/', authz } = options;
	server.use(authz ?? setupAuthzAdmin());

	const initialSearch = initialRoute.includes('?')
		? initialRoute.slice(initialRoute.indexOf('?'))
		: '';
	resetNuqsState(initialSearch);

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { refetchOnWindowFocus: false, retry: false },
			mutations: { retry: false },
		},
	});

	return render(
		<TestRouter initialRoute={initialRoute}>
			<UrlAdapter searchParams={initialSearch}>
				<QueryClientProvider client={queryClient}>
					<AppContext.Provider value={getAppContextMock(role)}>
						<TimezoneProvider>
							<VirtuosoMockContext.Provider
								value={{ viewportHeight: 800, itemHeight: 46 }}
							>
								<ListAlertRules />
							</VirtuosoMockContext.Provider>
						</TimezoneProvider>
					</AppContext.Provider>
				</QueryClientProvider>
			</UrlAdapter>
		</TestRouter>,
	);
}

export async function findAlertRow(alertName: string): Promise<HTMLElement> {
	const cell = await screen.findByText(alertName, {}, { timeout: 5000 });
	const row = cell.closest('tr');
	if (!row) {
		throw new Error(`Row not found for alert "${alertName}"`);
	}
	return row as HTMLElement;
}

type User = ReturnType<typeof userEvent.setup>;

export function setSearchDraft(value: string): void {
	const view = EditorView.findFromDOM(
		screen.getByTestId('alert-rules-list-search'),
	);
	if (!view) {
		throw new Error('Search editor not found');
	}
	act(() => {
		view.dispatch({
			changes: { from: 0, to: view.state.doc.length, insert: value },
		});
	});
}

export function getSearchDraft(): string {
	const view = EditorView.findFromDOM(
		screen.getByTestId('alert-rules-list-search'),
	);
	return view?.state.doc.toString() ?? '';
}

export async function runSearchQuery(user: User, value: string): Promise<void> {
	setSearchDraft(value);
	await user.click(screen.getByTestId('alert-rules-list-search-submit'));
}

/** A permission-gated button is inert until its check answers. */
export async function waitForAuthZButton(testId: string): Promise<HTMLElement> {
	const button = await screen.findByTestId(testId);
	await waitFor(() => expect(button).toHaveAttribute('aria-disabled', 'false'), {
		timeout: 5000,
	});
	return button;
}
