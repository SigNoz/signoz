import { render, screen, within } from 'tests/test-utils';

import { mockRules } from '../../../../__tests__/fixtures';
import ModelCostsTable from '../ModelCostsTable';

const noop = (): void => {};

// The table owns page/limit URL state via nuqs, which reads window.location.
// jsdom shares that across tests in a file, so reset it before each.
function resetUrl(): void {
	window.history.pushState(null, '', '/');
}

function getRow(ruleId: string): HTMLElement {
	return screen
		.getByTestId(`model-cell-name-${ruleId}`)
		.closest('tr') as HTMLElement;
}

describe('ModelCostsTable', () => {
	beforeEach(() => {
		resetUrl();
	});

	it('renders the empty state when not loading and there are no rules', () => {
		render(
			<ModelCostsTable
				rules={[]}
				isLoading={false}
				total={0}
				selectedRuleId={null}
				canManage
				onEdit={noop}
				onDelete={noop}
			/>,
		);

		const empty = screen.getByTestId('model-costs-empty');
		expect(empty).toHaveTextContent('No model costs yet.');
	});

	it('does not show the empty state while loading even with no rules', () => {
		render(
			<ModelCostsTable
				rules={[]}
				isLoading
				total={0}
				selectedRuleId={null}
				canManage
				onEdit={noop}
				onDelete={noop}
			/>,
		);

		expect(screen.queryByTestId('model-costs-empty')).not.toBeInTheDocument();
		expect(screen.getByTestId('model-costs-table')).toBeInTheDocument();
	});

	it('renders rows from the rules with formatted prices, provider, canonical id and source badges', () => {
		render(
			<ModelCostsTable
				rules={mockRules}
				isLoading={false}
				total={mockRules.length}
				selectedRuleId={null}
				canManage
				onEdit={noop}
				onDelete={noop}
			/>,
		);

		// Model names.
		expect(screen.getByTestId('model-cell-name-rule-openai')).toHaveTextContent(
			'gpt-4o',
		);
		expect(
			screen.getByTestId('model-cell-name-rule-anthropic'),
		).toHaveTextContent('claude-3-5-sonnet');

		// Canonical id under the model name.
		expect(screen.getByText('openai:gpt-4o')).toBeInTheDocument();

		// Provider column.
		expect(screen.getAllByText('OpenAI').length).toBeGreaterThan(0);

		// Formatted input price ($3.00) for the openai row.
		const openaiRow = getRow('rule-openai');
		expect(within(openaiRow).getByText('$3.00')).toBeInTheDocument();

		// Source label badges reflect the override flag.
		expect(screen.getByTestId('source-badge-rule-openai')).toHaveTextContent(
			'User override',
		);
		expect(screen.getByTestId('source-badge-rule-anthropic')).toHaveTextContent(
			'Auto',
		);
	});

	it('renders no row action button when the user cannot manage', () => {
		render(
			<ModelCostsTable
				rules={mockRules}
				isLoading={false}
				total={mockRules.length}
				selectedRuleId={null}
				canManage={false}
				onEdit={noop}
				onDelete={noop}
			/>,
		);

		const openaiRow = getRow('rule-openai');
		expect(within(openaiRow).queryByRole('button')).not.toBeInTheDocument();
	});
});
