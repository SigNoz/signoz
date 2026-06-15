import {
	LlmpricingruletypesLLMPricingRuleUnitDTO as UnitDTO,
	type LlmpricingruletypesLLMPricingRuleDTO,
} from 'api/generated/services/sigNoz.schemas';
import { rest, server } from 'mocks-server/server';
import { fireEvent, render, screen } from 'tests/test-utils';

import LLMObservabilityModelPricing from '../LLMObservabilityModelPricing';

const ENDPOINT = '*/api/v1/llm_pricing_rules';

const mockRules: LlmpricingruletypesLLMPricingRuleDTO[] = [
	{
		id: 'rule-gpt4o',
		orgId: 'org-1',
		modelName: 'gpt-4o',
		provider: 'OpenAI',
		modelPattern: ['gpt-4o'],
		isOverride: false,
		enabled: true,
		unit: UnitDTO.per_million_tokens,
		pricing: { input: 15, output: 60 },
	},
	{
		id: 'rule-llama',
		orgId: 'org-1',
		modelName: 'llama-3.1-70b',
		provider: 'Self-hosted',
		modelPattern: ['llama-3.1'],
		isOverride: true,
		enabled: true,
		unit: UnitDTO.per_million_tokens,
		pricing: { input: 0, output: 0 },
	},
];

describe('LLMObservabilityModelPricing', () => {
	beforeEach(() => {
		server.use(
			rest.get(ENDPOINT, (_, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({
						status: 'success',
						data: {
							items: mockRules,
							limit: 100,
							offset: 0,
							total: mockRules.length,
						},
					}),
				),
			),
		);
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('renders the page header and both rules', async () => {
		render(<LLMObservabilityModelPricing />);

		await screen.findByText('gpt-4o');
		expect(screen.getByText('Configuration')).toBeInTheDocument();
		expect(screen.getByText('llama-3.1-70b')).toBeInTheDocument();
		expect(screen.getByText('openai:gpt-4o')).toBeInTheDocument();
	});

	it('filters rules by the search input', async () => {
		render(<LLMObservabilityModelPricing />);

		await screen.findByText('gpt-4o');

		fireEvent.change(screen.getByTestId('search-input'), {
			target: { value: 'llama' },
		});

		expect(screen.queryByText('gpt-4o')).not.toBeInTheDocument();
		expect(screen.getByText('llama-3.1-70b')).toBeInTheDocument();
	});

	it('opens the drawer in Add mode when the Add button is clicked', async () => {
		render(<LLMObservabilityModelPricing />);

		await screen.findByText('gpt-4o');
		fireEvent.click(screen.getByTestId('add-model-cost-btn'));

		const input = (await screen.findByTestId(
			'drawer-model-id-input',
		)) as HTMLInputElement;
		expect(input).toBeInTheDocument();
		expect(input.value).toBe('');
	});

	it('opens the drawer in Edit mode with prefilled values when a row Edit is clicked', async () => {
		render(<LLMObservabilityModelPricing />);

		await screen.findByText('gpt-4o');
		fireEvent.click(screen.getByTestId('edit-rule-rule-gpt4o'));

		const input = (await screen.findByTestId(
			'drawer-model-id-input',
		)) as HTMLInputElement;
		expect(input).toBeInTheDocument();
		expect(input.value).toBe('gpt-4o');
	});

	it('hides the Add button for non-admin users (write APIs are Admin-only)', async () => {
		render(<LLMObservabilityModelPricing />, {}, { role: 'VIEWER' });

		await screen.findByText('gpt-4o');
		expect(screen.queryByTestId('add-model-cost-btn')).not.toBeInTheDocument();
		// rows still open in read-only "View" mode
		expect(screen.getByTestId('edit-rule-rule-gpt4o')).toHaveTextContent('View');
	});
});
