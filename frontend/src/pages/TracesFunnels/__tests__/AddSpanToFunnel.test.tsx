/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable react/jsx-props-no-spreading */
import {
	fireEvent,
	render,
	RenderResult,
	screen,
	waitFor,
	within,
} from '@testing-library/react';
import ROUTES from 'constants/routes';
import Success, {
	ISuccessProps,
} from 'container/TraceWaterfall/TraceWaterfallStates/Success/Success';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { AppProvider } from 'providers/App/App';
import MockQueryClientProvider from 'providers/test/MockQueryClientProvider';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';

import { FunnelProvider } from '../FunnelContext';
import {
	mockFunnelsListData,
	mockSpanSuccessComponentProps,
} from './mockFunnelsData';

jest.mock('uplot', () => {
	const paths = {
		spline: jest.fn(),
		bars: jest.fn(),
	};
	const uplotMock = jest.fn(() => ({
		paths,
	}));
	return {
		paths,
		default: uplotMock,
	};
});

const firstFunnel = mockFunnelsListData[0];
const secondFunnel = mockFunnelsListData[1];

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { search: string } => ({
		search: '',
	}),
}));

const renderTraceWaterfallSuccess = (
	props: Partial<ISuccessProps> = {},
): RenderResult =>
	render(
		<MockQueryClientProvider>
			<AppProvider>
				<FunnelProvider funnelId={firstFunnel.funnel_id}>
					<MemoryRouter initialEntries={[ROUTES.TRACES_FUNNELS_DETAIL]}>
						<Success {...mockSpanSuccessComponentProps} {...props} />
					</MemoryRouter>
				</FunnelProvider>
			</AppProvider>
		</MockQueryClientProvider>,
	);

window.Element.prototype.getBoundingClientRect = jest
	.fn()
	.mockReturnValue({ height: 1000, width: 1000 });

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: jest.Mock } => ({
		safeNavigate: jest.fn(),
	}),
}));

jest.mock('react-redux', () => ({
	...jest.requireActual('react-redux'),
	useSelector: (): { selectedTime: string; loading: boolean } => ({
		selectedTime: '1h',
		loading: false,
	}),
}));

const mockUseFunnelsList = jest.fn();
const mockUseValidateFunnelSteps = jest.fn(() => ({
	data: { payload: { data: [] } },
	isLoading: false,
	isFetching: false,
}));
const mockUseUpdateFunnelSteps = jest.fn(() => ({
	mutate: jest.fn(),
	isLoading: false,
}));

jest.mock('hooks/TracesFunnels/useFunnels', () => ({
	...jest.requireActual('hooks/TracesFunnels/useFunnels'),
	useFunnelsList: (): void => mockUseFunnelsList(),
	useValidateFunnelSteps: (): {
		data: { payload: { data: unknown[] } };
		isLoading: boolean;
	} => mockUseValidateFunnelSteps(),
	useUpdateFunnelSteps: (): { mutate: jest.Mock; isLoading: boolean } =>
		mockUseUpdateFunnelSteps(),
}));

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useHistory: jest.fn(() => ({
		location: {
			pathname: '',
			search: '',
		},
	})),
	useLocation: jest.fn(() => ({
		pathname: '',
		search: '',
	})),
}));

jest.mock(
	'container/QueryBuilder/filters/QueryBuilderSearchV2/QueryBuilderSearchV2',
	() =>
		function MockQueryBuilderSearchV2(): JSX.Element {
			return <div>MockQueryBuilderSearchV2</div>;
		},
);

jest.mock(
	'components/OverlayScrollbar/OverlayScrollbar',
	() =>
		function MockOverlayScrollbar({
			children,
		}: {
			children: React.ReactNode;
		}): React.ReactNode {
			return children;
		},
);

jest.mock('providers/App/utils', () => ({
	getUserDefaults: jest.fn(() => ({
		accessJwt: 'mock-access-token',
		refreshJwt: 'mock-refresh-token',
		id: 'mock-user-id',
		email: 'editor@example.com',
		displayName: 'Test Editor',
		createdAt: Date.now(),
		organization: 'Test Organization',
		orgId: 'mock-org-id',
		role: 'EDITOR',
	})),
}));

describe('Add span to funnel from trace details page', () => {
	// Set NODE_ENV to development for modal to render
	const originalNodeEnv = process.env.NODE_ENV;

	beforeAll(() => {
		process.env.NODE_ENV = 'development';
	});

	afterAll(() => {
		process.env.NODE_ENV = originalNodeEnv;
	});

	it('displays add to funnel icon for spans with valid service and span names', async () => {
		await act(() => renderTraceWaterfallSuccess());
		expect(await screen.findByTestId('add-to-funnel-button')).toBeInTheDocument();
	});

	it("doesn't display add to funnel icon for spans with invalid service and span names", async () => {
		await act(() =>
			renderTraceWaterfallSuccess({
				spans: [
					{
						...mockSpanSuccessComponentProps.spans[0],
						serviceName: '',
						name: '',
					},
				],
			}),
		);

		await waitFor(() => {
			expect(screen.queryByTestId('add-to-funnel-button')).not.toBeInTheDocument();
		});
	});

	describe('add span to funnel modal tests', () => {
		beforeEach(async () => {
			mockUseFunnelsList.mockReturnValue({
				data: { payload: mockFunnelsListData },
				isLoading: false,
				isError: false,
			});

			server.use(
				rest.get(
					`http://localhost/api/v1/trace-funnels/${firstFunnel.funnel_id}`,
					(_, res, ctx) => res(ctx.status(200), ctx.json({ data: firstFunnel })),
				),
			);

			await act(() => renderTraceWaterfallSuccess());

			const addFunnelButton = await screen.findByTestId('add-to-funnel-button');
			await act(() => {
				fireEvent.click(addFunnelButton);
			});

			expect(await screen.findByRole('dialog')).toBeInTheDocument();
			expect(await screen.findByText(firstFunnel.funnel_name)).toBeInTheDocument();
		});

		it('should display the add to funnel modal when the add to funnel icon is clicked', async () => {
			expect(await screen.findByRole('dialog')).toBeInTheDocument();

			const addSpanToFunnelModal = await screen.findByRole('dialog');

			expect(
				within(addSpanToFunnelModal).getByText('Add span to funnel'),
			).toBeInTheDocument();

			expect(
				within(addSpanToFunnelModal).getByPlaceholderText(
					'Search by name, description, or tags...',
				),
			).toBeInTheDocument();

			expect(
				within(addSpanToFunnelModal).getByText('Create new funnel'),
			).toBeInTheDocument();

			expect(
				within(addSpanToFunnelModal).getByText(firstFunnel.funnel_name),
			).toBeInTheDocument();
			expect(
				within(addSpanToFunnelModal).getByText(secondFunnel.funnel_name),
			).toBeInTheDocument();
			expect(
				within(addSpanToFunnelModal).getByText(firstFunnel.user_email),
			).toBeInTheDocument();
			expect(
				within(addSpanToFunnelModal).getByText(secondFunnel.user_email),
			).toBeInTheDocument();
		});

		it('should search / filter when the user types in the search input', async () => {
			const addSpanToFunnelModal = await screen.findByRole('dialog');
			const searchInput = within(addSpanToFunnelModal).getByPlaceholderText(
				'Search by name, description, or tags...',
			);
			await act(() =>
				fireEvent.change(searchInput, {
					target: { value: firstFunnel.funnel_name },
				}),
			);

			await waitFor(() => {
				expect(searchInput).toHaveValue(firstFunnel.funnel_name);
				expect(
					within(addSpanToFunnelModal).getByText(firstFunnel.funnel_name),
				).toBeInTheDocument();
				expect(
					within(addSpanToFunnelModal).queryByText(secondFunnel.funnel_name),
				).not.toBeInTheDocument();
			});
		});
		describe('funnel details view tests', () => {
			beforeEach(async () => {
				expect(await screen.findByRole('dialog')).toBeInTheDocument();

				const addSpanToFunnelModal = await screen.findByRole('dialog');

				const firstFunnelButton = await within(addSpanToFunnelModal).findByText(
					firstFunnel.funnel_name,
				);
				await act(() => {
					fireEvent.click(firstFunnelButton);
				});

				await within(addSpanToFunnelModal).findByRole('button', {
					name: 'All funnels',
				});
			});
			it('should go to funnels details view of modal when a funnel is clicked, and go back to list view on clicking all funnels button', async () => {
				expect(await screen.findByRole('dialog')).toBeInTheDocument();
				const addSpanToFunnelModal = await screen.findByRole('dialog');

				expect(
					within(addSpanToFunnelModal).getByRole('button', {
						name: 'All funnels',
					}),
				).toBeInTheDocument();
				expect(
					within(addSpanToFunnelModal).queryByRole('button', {
						name: 'Create new funnel',
					}),
				).not.toBeInTheDocument();

				const allFunnelsButton = await within(addSpanToFunnelModal).getByText(
					/all funnels/i,
				);
				await act(() => {
					fireEvent.click(allFunnelsButton);
				});

				await within(addSpanToFunnelModal).findByRole('button', {
					name: 'Create new funnel',
				});

				expect(
					within(addSpanToFunnelModal).getByRole('button', {
						name: 'Create new funnel',
					}),
				).toBeInTheDocument();
				expect(
					within(addSpanToFunnelModal).queryByRole('button', {
						name: 'All funnels',
					}),
				).not.toBeInTheDocument();
			});

			it('should render the funnel preview card correctly', async () => {
				expect(await screen.findByRole('dialog')).toBeInTheDocument();
				const addSpanToFunnelModal = await screen.findByRole('dialog');

				expect(
					within(addSpanToFunnelModal).getByText(firstFunnel.funnel_name),
				).toBeInTheDocument();
				expect(
					within(addSpanToFunnelModal).getByText(firstFunnel.user_email),
				).toBeInTheDocument();
			});
			it('should render the funnel steps correctly', async () => {
				expect(await screen.findByRole('dialog')).toBeInTheDocument();
				const addSpanToFunnelModal = await screen.findByRole('dialog');

				const expectTextWithCount = async (
					text: string,
					count: number,
				): Promise<void> => {
					expect(
						await within(addSpanToFunnelModal).findAllByText(text),
					).toHaveLength(count);
				};

				await expectTextWithCount('Step 1', 1);
				await expectTextWithCount('Step 2', 1);
				await expectTextWithCount('ServiceA', 1);
				await expectTextWithCount('SpanA', 1);
				await expectTextWithCount('ServiceB', 1);
				await expectTextWithCount('SpanB', 1);
				await expectTextWithCount('Where', 2);
				await expectTextWithCount('Errors', 2);
				await expectTextWithCount('Latency type', 1);
				await expectTextWithCount('P99', 1);
				await expectTextWithCount('P95', 1);
				await expectTextWithCount('P90', 1);
				await expectTextWithCount('Replace', 2);
			});
			it('should replace the selected span and service names on clicking the replace button', async () => {
				expect(await screen.findByRole('dialog')).toBeInTheDocument();
				const addSpanToFunnelModal = await screen.findByRole('dialog');

				expect(within(addSpanToFunnelModal).getByText('SpanA')).toBeInTheDocument();
				expect(
					within(addSpanToFunnelModal).getByText('ServiceA'),
				).toBeInTheDocument();

				const replaceButtons = await within(
					addSpanToFunnelModal,
				).findAllByRole('button', { name: /replace/i });
				expect(replaceButtons[0]).toBeEnabled();
				await act(() => {
					fireEvent.click(replaceButtons[0]);
				});

				expect(
					within(addSpanToFunnelModal).getByText('producer-svc-3'),
				).toBeInTheDocument();
				expect(
					within(addSpanToFunnelModal).getByText('topic2 publish'),
				).toBeInTheDocument();
				expect(replaceButtons[0]).toBeDisabled();
			});
			it('should add the span as a new step on clicking the add for a new step button', async () => {
				expect(await screen.findByRole('dialog')).toBeInTheDocument();
				const addSpanToFunnelModal = await screen.findByRole('dialog');

				const addNewStepButton = await within(
					addSpanToFunnelModal,
				).findByRole('button', { name: /add for new step/i });
				await act(() => {
					fireEvent.click(addNewStepButton);
				});
				expect(
					await within(addSpanToFunnelModal).queryByText('Add for new Step'),
				).not.toBeInTheDocument();
				expect(
					await within(addSpanToFunnelModal).findAllByText('Where'),
				).toHaveLength(3);
			});
		});
	});
});
