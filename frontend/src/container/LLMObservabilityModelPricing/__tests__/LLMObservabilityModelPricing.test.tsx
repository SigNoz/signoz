import {
	LlmpricingruletypesLLMPricingRuleUnitDTO as UnitDTO,
	type LlmpricingruletypesLLMPricingRuleDTO,
} from 'api/generated/services/sigNoz.schemas';
import { rest, server } from 'mocks-server/server';
import { fireEvent, render, screen, waitFor } from 'tests/test-utils';

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

	it('search is server-driven: typing sends the q param to the list request', async () => {
		const requestedQ: (string | null)[] = [];
		server.use(
			rest.get(ENDPOINT, (req, res, ctx) => {
				requestedQ.push(req.url.searchParams.get('q'));
				return res(
					ctx.status(200),
					ctx.json({
						status: 'success',
						data: { items: mockRules, limit: 20, offset: 0, total: mockRules.length },
					}),
				);
			}),
		);

		render(<LLMObservabilityModelPricing />);

		await screen.findByText('gpt-4o');

		fireEvent.change(screen.getByTestId('search-input'), {
			target: { value: 'llama' },
		});

		// Debounced, so the request fires shortly after typing stops.
		await waitFor(() => expect(requestedQ).toContain('llama'));
	});

	// TODO: drive this through the actual source <SelectSimple> UI (open the
	// dropdown + click "User override") instead of seeding the URL. The radix
	// Select popover doesn't open under jsdom, so for now we assert the wiring
	// via the URL param. Fix once we have a reliable way to interact with the
	// Select in tests.
	it('source filter is server-driven: the URL source param is sent to the list request', async () => {
		const requestedSource: (string | null)[] = [];
		server.use(
			rest.get(ENDPOINT, (req, res, ctx) => {
				requestedSource.push(req.url.searchParams.get('source'));
				return res(
					ctx.status(200),
					ctx.json({
						status: 'success',
						data: { items: mockRules, limit: 20, offset: 0, total: mockRules.length },
					}),
				);
			}),
		);

		render(
			<LLMObservabilityModelPricing />,
			{},
			{ initialRoute: '/?source=override' },
		);

		await screen.findByText('gpt-4o');

		await waitFor(() => expect(requestedSource).toContain('override'));
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

	it('paginates server-side: selecting page 2 requests the next offset', async () => {
		const requestedOffsets: number[] = [];
		server.use(
			rest.get(ENDPOINT, (req, res, ctx) => {
				const offset = Number(req.url.searchParams.get('offset') ?? '0');
				requestedOffsets.push(offset);
				return res(
					ctx.status(200),
					ctx.json({
						status: 'success',
						data: {
							items: [
								{ ...mockRules[0], id: `rule-${offset}`, modelName: `model-${offset}` },
							],
							limit: 20,
							offset,
							total: 25,
						},
					}),
				);
			}),
		);

		render(<LLMObservabilityModelPricing />);

		await screen.findByText('model-0');
		fireEvent.click(screen.getByRole('button', { name: '2' }));

		await screen.findByText('model-20');
		expect(requestedOffsets).toContain(20);
	});
});
