import { rest, server } from 'mocks-server/server';
import { render, screen } from 'tests/test-utils';

import LLMObservabilityModelPricing from '../LLMObservabilityModelPricing';
import { LLM_PRICING_ENDPOINT, makeListResponse, mockRules } from './fixtures';

function setupList(items = mockRules): void {
	server.use(
		rest.get(LLM_PRICING_ENDPOINT, (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(makeListResponse(items))),
		),
	);
}

describe('LLMObservabilityModelPricing', () => {
	beforeEach(() => {
		window.history.pushState(null, '', '/');
		setupList();
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('renders the model-pricing page', () => {
		render(<LLMObservabilityModelPricing />);

		expect(
			screen.getByTestId('llm-observability-model-pricing-page'),
		).toBeInTheDocument();
	});

	it('shows the model-costs and unpriced-models sub-tab labels', () => {
		render(<LLMObservabilityModelPricing />);

		expect(screen.getByRole('tab', { name: 'Model costs' })).toBeInTheDocument();
		expect(
			screen.getByRole('tab', { name: /Unpriced models/ }),
		).toBeInTheDocument();
	});

	it('activates the model-costs tab by default and renders its content', async () => {
		render(<LLMObservabilityModelPricing />);

		const modelCostsTab = screen.getByRole('tab', { name: 'Model costs' });
		expect(modelCostsTab).toHaveAttribute('data-state', 'active');
		const searchInput = await screen.findByPlaceholderText(
			'Search by model or provider',
		);
		expect(searchInput).toBeInTheDocument();
	});

	it('disables the unpriced-models tab', () => {
		render(<LLMObservabilityModelPricing />);

		const unpricedTab = screen.getByRole('tab', { name: /Unpriced models/ });
		expect(unpricedTab).toBeDisabled();
	});
});
