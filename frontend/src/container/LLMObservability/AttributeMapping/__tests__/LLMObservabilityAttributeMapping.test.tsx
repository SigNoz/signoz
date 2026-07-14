import { rest, server } from 'mocks-server/server';
import { render, screen } from 'tests/test-utils';

import LLMObservabilityAttributeMapping from '../LLMObservabilityAttributeMapping';
import { GROUPS_ENDPOINT, makeGroupsResponse, mockGroups } from './fixtures';

function setupGroups(): void {
	server.use(
		rest.get(GROUPS_ENDPOINT, (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(makeGroupsResponse(mockGroups))),
		),
	);
}

describe('LLMObservabilityAttributeMapping', () => {
	beforeEach(() => {
		window.history.pushState(null, '', '/');
		setupGroups();
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('renders the page shell', () => {
		render(<LLMObservabilityAttributeMapping />);

		expect(
			screen.getByTestId('llm-observability-attribute-mapping-page'),
		).toBeInTheDocument();
	});

	it('shows the attribute-mappings and test sub-tab labels', () => {
		render(<LLMObservabilityAttributeMapping />);

		expect(
			screen.getByRole('tab', { name: 'Attribute mappings' }),
		).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: 'Test' })).toBeInTheDocument();
	});

	it('activates the attribute-mappings tab by default and renders its content', async () => {
		render(<LLMObservabilityAttributeMapping />);

		const attributeMappingsTab = screen.getByRole('tab', {
			name: 'Attribute mappings',
		});
		expect(attributeMappingsTab).toHaveAttribute('data-state', 'active');
		await expect(
			screen.findByTestId('attribute-mappings-tab'),
		).resolves.toBeInTheDocument();
	});

	it('renders the header with its description and no Save/Discard while pristine', () => {
		render(<LLMObservabilityAttributeMapping />);

		expect(
			screen.getByText(
				'Configure source-to-target attribute remapping for LLM traces',
			),
		).toBeInTheDocument();
		// The actions only appear once there are staged changes.
		expect(screen.queryByTestId('save-changes-btn')).not.toBeInTheDocument();
		expect(screen.queryByTestId('discard-changes-btn')).not.toBeInTheDocument();
		expect(screen.queryByTestId('unsaved-changes')).not.toBeInTheDocument();
	});
});
