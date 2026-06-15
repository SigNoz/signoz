import { SpantypesSpanMapperGroupDTO } from 'api/generated/services/sigNoz.schemas';
import { rest, server } from 'mocks-server/server';
import { fireEvent, render, screen } from 'tests/test-utils';

import LLMObservabilityAttributeMapping from '../LLMObservabilityAttributeMapping';

const GROUPS_ENDPOINT = '*/api/v1/span_mapper_groups';

const mockGroups: SpantypesSpanMapperGroupDTO[] = [
	{
		id: 'group-openai',
		orgId: 'org-1',
		name: 'OpenAI gateway',
		enabled: true,
		condition: { attributes: ['gen_ai.'], resource: [] },
		updatedBy: 'gaurav.tewari@signoz.io',
		updatedAt: '2026-06-10T09:30:00Z',
	},
];

describe('LLMObservabilityAttributeMapping', () => {
	beforeEach(() => {
		server.use(
			rest.get(GROUPS_ENDPOINT, (_, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({ status: 'success', data: { items: mockGroups } }),
				),
			),
		);
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('renders the page header and the group row', async () => {
		render(<LLMObservabilityAttributeMapping />);

		await screen.findByTestId('group-name-group-openai');
		expect(screen.getByText('Attribute Mapping')).toBeInTheDocument();
		expect(screen.getByText('OpenAI gateway')).toBeInTheDocument();
	});

	it('opens the group drawer in Add mode with empty name', async () => {
		render(<LLMObservabilityAttributeMapping />);

		await screen.findByTestId('group-name-group-openai');
		fireEvent.click(screen.getByTestId('add-group-btn'));

		const input = (await screen.findByTestId(
			'group-form-name',
		)) as HTMLInputElement;
		expect(input.value).toBe('');
	});

	it('opens the group drawer in Edit mode prefilled with the group name', async () => {
		render(<LLMObservabilityAttributeMapping />);

		await screen.findByTestId('group-name-group-openai');
		fireEvent.click(screen.getByTestId('group-edit-group-openai'));

		const input = (await screen.findByTestId(
			'group-form-name',
		)) as HTMLInputElement;
		expect(input.value).toBe('OpenAI gateway');
	});
});
