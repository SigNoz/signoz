import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { MemoryRouter as MemoryRouterV5 } from 'react-router-dom-v5-compat';
import { TooltipProvider } from '@signozhq/ui/tooltip';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NuqsTestingAdapter, UrlUpdateEvent } from 'nuqs/adapters/testing';
import { AppProvider } from 'providers/App/App';
import { QueryBuilderProvider } from 'providers/QueryBuilder';
import TimezoneProvider from 'providers/Timezone';
import store from 'store';

import { K8sCategories } from '../constants';
import InfraMonitoringK8s from '../InfraMonitoringK8s';

// Quick filters fire their own field APIs and are irrelevant to pagination.
jest.mock('components/QuickFilters/QuickFilters', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="quick-filters" />,
}));

// The list owns its own page recovery; stubbing it keeps the page param under the
// sole control of the category handler being tested here.
jest.mock('../Base/K8sDynamicList', () => ({
	__esModule: true,
	K8sDynamicList: (): JSX.Element => <div data-testid="k8s-dynamic-list" />,
	default: (): JSX.Element => <div data-testid="k8s-dynamic-list" />,
}));

// Analytics only; jsdom lacks the Performance navigation entries it reads.
jest.mock('lib/navigation', () => ({
	getNavigationReferrer: (): string => 'direct',
}));

function renderPage(
	queryParams: Record<string, string>,
	onUrlUpdate: jest.Mock<void, [UrlUpdateEvent]>,
): void {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	render(
		<MemoryRouter>
			<MemoryRouterV5>
				<TimezoneProvider>
					<QueryClientProvider client={queryClient}>
						<AppProvider>
							<Provider store={store}>
								<NuqsTestingAdapter
									searchParams={queryParams}
									onUrlUpdate={onUrlUpdate}
								>
									<TooltipProvider>
										<QueryBuilderProvider>
											<InfraMonitoringK8s />
										</QueryBuilderProvider>
									</TooltipProvider>
								</NuqsTestingAdapter>
							</Provider>
						</AppProvider>
					</QueryClientProvider>
				</TimezoneProvider>
			</MemoryRouterV5>
		</MemoryRouter>,
	);
}

describe('InfraMonitoringK8s', () => {
	describe('when the category changes from a page other than the first', () => {
		const onUrlUpdateMock = jest.fn<void, [UrlUpdateEvent]>();

		beforeEach(async () => {
			onUrlUpdateMock.mockClear();

			renderPage(
				{ category: K8sCategories.PODS, page: '3', pageSize: '10' },
				onUrlUpdateMock,
			);

			await screen.findByTestId(`category-${K8sCategories.NODES}`);
		});

		it('should drop the page so the new category starts at the first one', async () => {
			fireEvent.click(screen.getByTestId(`category-${K8sCategories.NODES}`));

			// Page 3 of pods says nothing about nodes — keeping it asks the new entity
			// for an offset it may not have. The param is cleared rather than set to 1,
			// since an absent page already means the first one.
			await waitFor(() => {
				const categorySwitch = onUrlUpdateMock.mock.calls.find(
					(call) => call[0].searchParams.get('category') === K8sCategories.NODES,
				);

				expect(categorySwitch).toBeDefined();
				expect(categorySwitch?.[0].searchParams.get('page')).toBeNull();
			});
		});

		it('should keep the page size, which is not category specific', async () => {
			fireEvent.click(screen.getByTestId(`category-${K8sCategories.NODES}`));

			await waitFor(() => {
				const categorySwitch = onUrlUpdateMock.mock.calls.find(
					(call) => call[0].searchParams.get('category') === K8sCategories.NODES,
				);

				expect(categorySwitch?.[0].searchParams.get('pageSize')).toBe('10');
			});
		});

		it('should leave the page alone when the same category is clicked again', async () => {
			fireEvent.click(screen.getByTestId(`category-${K8sCategories.PODS}`));

			await waitFor(() => {
				expect(screen.getByTestId('k8s-dynamic-list')).toBeInTheDocument();
			});

			const droppedPage = onUrlUpdateMock.mock.calls.some(
				(call) => !call[0].searchParams.has('page'),
			);

			expect(droppedPage).toBe(false);
		});
	});
});
