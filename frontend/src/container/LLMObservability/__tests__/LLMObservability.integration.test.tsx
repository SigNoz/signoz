import { safeNavigateMock } from '__tests__/safeNavigateMock';
import ROUTES from 'constants/routes';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import {
	LLM_PRICING_ENDPOINT,
	makeListResponse,
	mockRules,
} from '../Settings/ModelPricing/__tests__/fixtures';
import LLMObservability from '../LLMObservability';

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
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('renders the overview panel and the tab bar on the overview route', () => {
		render(<LLMObservability />, undefined, {
			initialRoute: ROUTES.LLM_OBSERVABILITY_OVERVIEW,
		});

		expect(screen.getByTestId('llm-observability-tabs')).toBeInTheDocument();
		expect(screen.getByTestId('llm-observability-overview')).toBeInTheDocument();
		expect(screen.getByText('LLM Observability')).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
		expect(
			screen.getByRole('tab', { name: 'Model pricing' }),
		).toBeInTheDocument();
	});

	it('navigates to the configuration route when the Model pricing tab is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<LLMObservability />, undefined, {
			initialRoute: ROUTES.LLM_OBSERVABILITY_OVERVIEW,
		});

		await user.click(screen.getByRole('tab', { name: 'Model pricing' }));

		expect(safeNavigateMock).toHaveBeenCalledWith(
			ROUTES.LLM_OBSERVABILITY_CONFIGURATION,
		);
	});

	it('renders the model-pricing page on the configuration route', async () => {
		setupList();
		render(<LLMObservability />, undefined, {
			initialRoute: ROUTES.LLM_OBSERVABILITY_CONFIGURATION,
		});

		await waitFor(() =>
			expect(
				screen.getByTestId('llm-observability-model-pricing-page'),
			).toBeInTheDocument(),
		);
	});

	it('defaults to the Model costs sub-tab and disables Unpriced models', async () => {
		setupList();
		render(<LLMObservability />, undefined, {
			initialRoute: ROUTES.LLM_OBSERVABILITY_CONFIGURATION,
		});

		const modelCostsTab = await screen.findByRole('tab', {
			name: 'Model costs',
		});
		expect(modelCostsTab).toHaveAttribute('data-state', 'active');
		expect(screen.getByRole('tab', { name: /Unpriced models/ })).toBeDisabled();
	});
});
