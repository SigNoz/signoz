import ROUTES from 'constants/routes';
import {
	LLM_PRICING_ENDPOINT,
	makeListResponse,
	mockRules,
} from 'container/LLMObservability/Settings/ModelPricing/__tests__/fixtures';
import { navigate } from 'lib/router/navigation';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import LLMObservabilityPage from '..';

// The Overview tab renders the full V2 DashboardContainer (toolbar + date picker
// call useNavigationType, which needs a data router this integration test doesn't
// set up). These cases assert tab routing, not dashboard rendering, so stub it.
jest.mock('pages/DashboardPage/DashboardContainer', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="llm-overview-dashboard" />,
}));

// Same data-router gap as the dashboard above: the Explorer toolbar calls useNavigationType.
jest.mock('container/LLMObservability/Explorer/Explorer', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="llm-observability-explorer" />,
}));

jest.mock('lib/router/navigation', () => ({
	...jest.requireActual('lib/router/navigation'),
	navigate: jest.fn(),
}));

const mockNavigate = navigate as jest.MockedFunction<typeof navigate>;

const SYSTEM_DASHBOARD_ENDPOINT = '*/api/v2/dashboards/system/ai-o11y-overview';

function setupSystemDashboard(): void {
	server.use(
		rest.get(SYSTEM_DASHBOARD_ENDPOINT, (_req, res, ctx) =>
			res(
				ctx.status(200),
				ctx.json({
					status: 'success',
					data: {
						orgId: 'org',
						locked: true,
						name: 'signoz---ai-o11y-overview',
						schemaVersion: 'v6',
						source: 'system',
						tags: null,
						spec: {
							display: { name: 'AI Observability Overview' },
							variables: [],
							panels: {},
							layouts: [],
						},
					},
				}),
			),
		),
	);
}

function setupList(items = mockRules): void {
	server.use(
		rest.get(LLM_PRICING_ENDPOINT, (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(makeListResponse(items))),
		),
	);
}

describe('LLMObservability (integration)', () => {
	beforeEach(() => {
		window.history.pushState(null, '', '/');
		mockNavigate.mockClear();
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('renders the overview panel and the tab bar on the overview route', async () => {
		setupSystemDashboard();
		render(<LLMObservabilityPage />, undefined, {
			initialRoute: ROUTES.AI_OBSERVABILITY_OVERVIEW,
		});

		expect(screen.getByTestId('llm-observability-page')).toBeInTheDocument();
		expect(screen.getByTestId('llm-observability-overview')).toBeInTheDocument();
		await waitFor(() =>
			expect(screen.getByTestId('llm-overview-dashboard')).toBeInTheDocument(),
		);
		expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: 'Explorer' })).toBeInTheDocument();
		expect(
			screen.getByRole('tab', { name: /Model pricing/ }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('tab', { name: /Attribute Mapping/ }),
		).toBeInTheDocument();
	});

	it('navigates to the configuration route when the Model pricing tab is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<LLMObservabilityPage />, undefined, {
			initialRoute: ROUTES.AI_OBSERVABILITY_OVERVIEW,
		});

		await user.click(screen.getByRole('tab', { name: /Model pricing/ }));

		expect(mockNavigate).toHaveBeenCalledWith(
			ROUTES.AI_OBSERVABILITY_CONFIGURATION,
		);
	});

	it('navigates to the attribute mapping route when that tab is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<LLMObservabilityPage />, undefined, {
			initialRoute: ROUTES.AI_OBSERVABILITY_OVERVIEW,
		});

		await user.click(screen.getByRole('tab', { name: /Attribute Mapping/ }));

		expect(mockNavigate).toHaveBeenCalledWith(
			ROUTES.AI_OBSERVABILITY_ATTRIBUTE_MAPPING,
		);
	});

	it('navigates to the explorer route when the Explorer tab is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<LLMObservabilityPage />, undefined, {
			initialRoute: ROUTES.AI_OBSERVABILITY_OVERVIEW,
		});

		await user.click(screen.getByRole('tab', { name: /Explorer/ }));

		expect(mockNavigate).toHaveBeenCalledWith(
			ROUTES.AI_OBSERVABILITY_EXPLORER,
		);
	});

	it('renders the explorer panel on the explorer route', () => {
		render(<LLMObservabilityPage />, undefined, {
			initialRoute: ROUTES.AI_OBSERVABILITY_EXPLORER,
		});

		expect(screen.getByTestId('llm-observability-explorer')).toBeInTheDocument();
	});

	it('renders the attribute mapping page on the attribute mapping route', () => {
		render(<LLMObservabilityPage />, undefined, {
			initialRoute: ROUTES.AI_OBSERVABILITY_ATTRIBUTE_MAPPING,
		});

		expect(
			screen.getByTestId('llm-observability-attribute-mapping-page'),
		).toBeInTheDocument();
	});

	it('renders the model-pricing page on the configuration route', async () => {
		setupList();
		render(<LLMObservabilityPage />, undefined, {
			initialRoute: ROUTES.AI_OBSERVABILITY_CONFIGURATION,
		});

		await waitFor(() =>
			expect(
				screen.getByTestId('llm-observability-model-pricing-page'),
			).toBeInTheDocument(),
		);
	});
});
