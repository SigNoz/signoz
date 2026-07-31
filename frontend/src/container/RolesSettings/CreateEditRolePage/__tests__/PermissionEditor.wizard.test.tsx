import { server } from 'mocks-server/server';
import { screen, userEvent, waitFor, within } from 'tests/test-utils';
import { setupAuthzAdmin } from 'lib/authz/utils/authz-test-utils';

import { expandResourceCard, renderCreateRolePage } from './testUtils';

jest.setTimeout(15_000);

beforeEach(() => {
	server.use(setupAuthzAdmin());
});

afterEach(() => {
	server.resetHandlers();
});

async function selectOnlySelected(
	user: ReturnType<typeof userEvent.setup>,
	resource = 'logs',
): Promise<void> {
	await renderCreateRolePage();
	await expandResourceCard(resource);

	const card = screen.getByTestId(`resource-card-${resource}`);
	const readToggle = within(card).getByTestId(`action-toggle-${resource}-read`);
	await user.click(await within(readToggle).findByText('Only selected'));
}

async function selectLogsOnlySelected(
	user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
	await selectOnlySelected(user, 'logs');
}

async function openWizard(
	user: ReturnType<typeof userEvent.setup>,
	resource = 'logs',
): Promise<void> {
	await selectOnlySelected(user, resource);

	await user.click(
		screen.getByTestId(`telemetry-wizard-trigger-${resource}-read`),
	);
	await screen.findByTestId(`telemetry-wizard-dialog-${resource}-read`);
}

async function openLogsWizard(
	user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
	await openWizard(user, 'logs');
}

describe('PermissionEditor - TelemetrySelectorWizard', () => {
	it('shows wizard button for telemetry resources', async () => {
		const user = userEvent.setup();
		await selectLogsOnlySelected(user);

		expect(
			screen.getByTestId('telemetry-wizard-trigger-logs-read'),
		).toBeInTheDocument();
	});

	it('does not show wizard button for non-telemetry resources', async () => {
		await renderCreateRolePage();
		await expandResourceCard('factor-api-key');

		const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
		const readToggle = within(apiKeyCard).getByTestId(
			'action-toggle-factor-api-key-read',
		);

		const user = userEvent.setup();
		await user.click(await within(readToggle).findByText('Only selected'));

		expect(
			within(apiKeyCard).queryByTestId(
				'telemetry-wizard-trigger-factor-api-key-read',
			),
		).not.toBeInTheDocument();
	});

	it('opens wizard dialog when trigger clicked', async () => {
		const user = userEvent.setup();
		await selectLogsOnlySelected(user);

		await user.click(screen.getByTestId('telemetry-wizard-trigger-logs-read'));

		await expect(
			screen.findByTestId('telemetry-wizard-dialog-logs-read'),
		).resolves.toBeInTheDocument();
	});

	it('adds a query-type wildcard when the value is left empty', async () => {
		const user = userEvent.setup();
		await openLogsWizard(user);

		await user.click(screen.getByTestId('wizard-add-btn-logs-read'));

		await expect(
			screen.findByText('builder_query/*'),
		).resolves.toBeInTheDocument();
	});

	it('does not offer builder sub query', async () => {
		const user = userEvent.setup();
		await openLogsWizard(user);

		await user.click(screen.getByTestId('wizard-query-type-select-logs-read'));

		expect(screen.queryByText('Builder Sub Query')).not.toBeInTheDocument();
	});

	it('does not show PromQL for logs', async () => {
		const user = userEvent.setup();
		await openLogsWizard(user);

		await user.click(screen.getByTestId('wizard-query-type-select-logs-read'));

		expect(
			screen.queryByTestId('wizard-query-type-option-promql-logs-read'),
		).not.toBeInTheDocument();
	});

	it('does not show PromQL for traces', async () => {
		const user = userEvent.setup();
		await openWizard(user, 'traces');

		await user.click(screen.getByTestId('wizard-query-type-select-traces-read'));

		expect(
			screen.queryByTestId('wizard-query-type-option-promql-traces-read'),
		).not.toBeInTheDocument();
	});

	it('allows PromQL for metrics', async () => {
		const user = userEvent.setup();
		await openWizard(user, 'metrics');

		await user.click(screen.getByTestId('wizard-query-type-select-metrics-read'));
		await user.click(
			await screen.findByTestId('wizard-query-type-option-promql-metrics-read'),
		);

		await user.click(screen.getByTestId('wizard-add-btn-metrics-read'));

		await expect(screen.findByText('promql/*')).resolves.toBeInTheDocument();
	});

	it('hardcodes the key and does not let it be edited', async () => {
		const user = userEvent.setup();
		await openLogsWizard(user);

		const keyInput = screen.getByTestId('wizard-key-input-logs-read');
		expect(keyInput).toHaveValue('signoz.workspace.key.id');
		expect(keyInput).toBeDisabled();
	});

	it('hides Key field for query types that do not support key scoping', async () => {
		const user = userEvent.setup();
		await openLogsWizard(user);

		await user.click(screen.getByTestId('wizard-query-type-select-logs-read'));
		await user.click(await screen.findByText('ClickHouse SQL'));

		expect(
			screen.queryByTestId('wizard-key-input-logs-read'),
		).not.toBeInTheDocument();
	});

	it('adds a key-scoped selector when the value is filled', async () => {
		const user = userEvent.setup();
		await openLogsWizard(user);

		await user.type(screen.getByTestId('wizard-value-input-logs-read'), '123');

		expect(screen.getByTestId('wizard-selector-input-logs-read')).toHaveValue(
			'builder_query/signoz.workspace.key.id/123',
		);

		await user.click(screen.getByTestId('wizard-add-btn-logs-read'));

		await expect(
			screen.findByText('builder_query/signoz.workspace.key.id/123'),
		).resolves.toBeInTheDocument();
	});

	it('replaces the value with a wildcard when any resource is checked', async () => {
		const user = userEvent.setup();
		await openLogsWizard(user);

		await user.click(screen.getByLabelText('Any value'));

		expect(screen.getByTestId('wizard-value-input-logs-read')).toHaveValue('*');

		await user.click(screen.getByTestId('wizard-add-btn-logs-read'));

		await expect(
			screen.findByText('builder_query/signoz.workspace.key.id/*'),
		).resolves.toBeInTheDocument();
	});

	it('clears the value when any resource is unchecked', async () => {
		const user = userEvent.setup();
		await openLogsWizard(user);

		const anyResource = screen.getByLabelText('Any value');
		await user.click(anyResource);
		expect(anyResource).toBeChecked();

		await user.click(anyResource);

		expect(anyResource).not.toBeChecked();
		expect(screen.getByTestId('wizard-value-input-logs-read')).toHaveValue('');
	});

	it('checks any resource when the value is typed as a wildcard', async () => {
		const user = userEvent.setup();
		await openLogsWizard(user);

		await user.type(screen.getByTestId('wizard-value-input-logs-read'), '*');

		expect(screen.getByLabelText('Any value')).toBeChecked();
	});

	it('disables value scoping for query types that do not support it', async () => {
		const user = userEvent.setup();
		await openLogsWizard(user);

		await user.click(screen.getByTestId('wizard-query-type-select-logs-read'));
		await user.click(await screen.findByText('ClickHouse SQL'));

		expect(screen.getByTestId('wizard-value-input-logs-read')).toBeDisabled();
		expect(screen.getByLabelText('Any value')).toBeDisabled();
	});

	it('clears the value when switching to a query type without key scoping', async () => {
		const user = userEvent.setup();
		await openLogsWizard(user);

		await user.type(screen.getByTestId('wizard-value-input-logs-read'), '123');

		await user.click(screen.getByTestId('wizard-query-type-select-logs-read'));
		await user.click(await screen.findByText('ClickHouse SQL'));

		expect(screen.getByTestId('wizard-value-input-logs-read')).toHaveValue('');
		expect(screen.getByTestId('wizard-selector-input-logs-read')).toHaveValue(
			'clickhouse_sql/*',
		);

		await user.click(screen.getByTestId('wizard-add-btn-logs-read'));

		await expect(
			screen.findByText('clickhouse_sql/*'),
		).resolves.toBeInTheDocument();
	});

	it('follows a hand-edited selector on the query type and value inputs', async () => {
		const user = userEvent.setup();
		await openLogsWizard(user);

		const selectorInput = screen.getByTestId('wizard-selector-input-logs-read');
		await user.clear(selectorInput);
		await user.type(
			selectorInput,
			'clickhouse_sql/signoz.workspace.key.id/checkout',
		);

		const selectTrigger = screen.getByTestId(
			'wizard-query-type-select-logs-read',
		);
		expect(within(selectTrigger).getByText('ClickHouse SQL')).toBeInTheDocument();
		expect(screen.getByTestId('wizard-value-input-logs-read')).toHaveValue(
			'checkout',
		);
	});

	it('checks any resource when the selector is edited to a wildcard value', async () => {
		const user = userEvent.setup();
		await openLogsWizard(user);

		const selectorInput = screen.getByTestId('wizard-selector-input-logs-read');
		await user.clear(selectorInput);
		await user.type(selectorInput, 'builder_query/signoz.workspace.key.id/*');

		expect(screen.getByLabelText('Any value')).toBeChecked();
	});

	it('keeps the key input hardcoded when the selector uses another key', async () => {
		const user = userEvent.setup();
		await openLogsWizard(user);

		const selectorInput = screen.getByTestId('wizard-selector-input-logs-read');
		await user.clear(selectorInput);
		await user.type(selectorInput, 'builder_query/service.name/frontend');

		expect(screen.getByTestId('wizard-key-input-logs-read')).toHaveValue(
			'signoz.workspace.key.id',
		);
		expect(
			screen.getByTestId('wizard-selector-hint-logs-read'),
		).toHaveTextContent('Allow service.name=frontend for Builder Query queries.');
		expect(screen.getByTestId('wizard-add-btn-logs-read')).not.toBeDisabled();
	});

	it('restores the hardcoded key in the selector once the value changes', async () => {
		const user = userEvent.setup();
		await openLogsWizard(user);

		const selectorInput = screen.getByTestId('wizard-selector-input-logs-read');
		await user.clear(selectorInput);
		await user.type(selectorInput, 'builder_query/service.name/frontend');

		await user.type(screen.getByTestId('wizard-value-input-logs-read'), '2');

		expect(selectorInput).toHaveValue(
			'builder_query/signoz.workspace.key.id/frontend2',
		);
		expect(screen.getByTestId('wizard-add-btn-logs-read')).not.toBeDisabled();
	});

	it('blocks adding when the selector has an unknown query type', async () => {
		const user = userEvent.setup();
		await openLogsWizard(user);

		const selectorInput = screen.getByTestId('wizard-selector-input-logs-read');
		await user.clear(selectorInput);
		await user.type(selectorInput, 'sql_query/*');

		expect(
			screen.getByTestId('wizard-selector-hint-logs-read'),
		).toHaveTextContent('"sql_query" is not a supported query type.');
		expect(screen.getByTestId('wizard-add-btn-logs-read')).toBeDisabled();
	});

	it('blocks adding when the selector is emptied', async () => {
		const user = userEvent.setup();
		await openLogsWizard(user);

		await user.clear(screen.getByTestId('wizard-selector-input-logs-read'));

		expect(
			screen.getByTestId('wizard-selector-hint-logs-read'),
		).toHaveTextContent('Enter a selector.');
		expect(screen.getByTestId('wizard-add-btn-logs-read')).toBeDisabled();
	});

	it('adds the hand-edited selector verbatim', async () => {
		const user = userEvent.setup();
		await openLogsWizard(user);

		const selectorInput = screen.getByTestId('wizard-selector-input-logs-read');
		await user.clear(selectorInput);
		await user.type(selectorInput, 'builder_query/signoz.workspace.key.id/a/b');

		await user.click(screen.getByTestId('wizard-add-btn-logs-read'));

		await expect(
			screen.findByText('builder_query/signoz.workspace.key.id/a/b'),
		).resolves.toBeInTheDocument();
	});

	it('closes dialog after adding selector', async () => {
		const user = userEvent.setup();
		await openLogsWizard(user);

		await user.click(screen.getByTestId('wizard-add-btn-logs-read'));

		await waitFor(() => {
			expect(
				screen.queryByTestId('telemetry-wizard-dialog-logs-read'),
			).not.toBeInTheDocument();
		});
	});

	it('does not add duplicate selectors', async () => {
		const user = userEvent.setup();
		await openLogsWizard(user);
		await user.click(screen.getByTestId('wizard-add-btn-logs-read'));

		await user.click(screen.getByTestId('telemetry-wizard-trigger-logs-read'));
		await screen.findByTestId('telemetry-wizard-dialog-logs-read');
		await user.click(screen.getByTestId('wizard-add-btn-logs-read'));

		const badges = screen.getAllByText('builder_query/*');
		expect(badges).toHaveLength(1);
	});

	it('resets wizard state when dialog is closed and reopened', async () => {
		const user = userEvent.setup();
		await openLogsWizard(user);

		await user.type(screen.getByTestId('wizard-value-input-logs-read'), '123');
		await user.click(screen.getByTestId('wizard-query-type-select-logs-read'));
		await user.click(await screen.findByText('ClickHouse SQL'));

		await user.click(screen.getByRole('button', { name: /cancel/i }));

		await waitFor(() => {
			expect(
				screen.queryByTestId('telemetry-wizard-dialog-logs-read'),
			).not.toBeInTheDocument();
		});

		await user.click(screen.getByTestId('telemetry-wizard-trigger-logs-read'));
		const selectTrigger = await screen.findByTestId(
			'wizard-query-type-select-logs-read',
		);

		expect(within(selectTrigger).getByText('Builder Query')).toBeInTheDocument();
		expect(screen.getByTestId('wizard-value-input-logs-read')).toHaveValue('');
		expect(screen.getByTestId('wizard-selector-input-logs-read')).toHaveValue(
			'builder_query/*',
		);
	});

	it('previews the query-type wildcard while the value is empty', async () => {
		const user = userEvent.setup();
		await openLogsWizard(user);

		expect(screen.getByTestId('wizard-selector-input-logs-read')).toHaveValue(
			'builder_query/*',
		);
		expect(
			screen.getByTestId('wizard-selector-hint-logs-read'),
		).toHaveTextContent('Allow every "Builder Query" query.');
	});

	it('describes a key-scoped selector', async () => {
		const user = userEvent.setup();
		await openLogsWizard(user);

		await user.type(screen.getByTestId('wizard-value-input-logs-read'), '123');

		expect(
			screen.getByTestId('wizard-selector-hint-logs-read'),
		).toHaveTextContent(
			'Allow signoz.workspace.key.id=123 for Builder Query queries.',
		);
	});

	it('describes an any-resource selector', async () => {
		const user = userEvent.setup();
		await openLogsWizard(user);

		await user.click(screen.getByLabelText('Any value'));

		expect(
			screen.getByTestId('wizard-selector-hint-logs-read'),
		).toHaveTextContent(
			'Allow every signoz.workspace.key.id for Builder Query queries.',
		);
	});

	it('does not show query type descriptions', async () => {
		const user = userEvent.setup();
		await openLogsWizard(user);

		await user.click(screen.getByTestId('wizard-query-type-select-logs-read'));

		expect(
			screen.queryByText(
				'Visual query builder for selecting data sources, filters, and aggregations',
			),
		).not.toBeInTheDocument();
	});
});
