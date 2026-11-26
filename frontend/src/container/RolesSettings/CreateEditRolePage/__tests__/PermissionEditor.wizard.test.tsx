import type { ComponentProps } from 'react';
import { server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor, within } from 'tests/test-utils';
import { setupAuthzAdmin } from 'lib/authz/utils/authz-test-utils';
import { AuthZResource } from 'lib/authz/hooks/useAuthZ/types';

import { PermissionScope } from '../../types';
import ActionToggle from '../components/ActionToggle';
import TelemetrySelectorWizard from '../components/TelemetrySelectorWizard';
import { selectOnlySelected } from './testUtils';

type User = ReturnType<typeof userEvent.setup>;
type OnAdd = ComponentProps<typeof TelemetrySelectorWizard>['onAdd'];
type OnSelectedIdsChange = ComponentProps<
	typeof ActionToggle
>['onSelectedIdsChange'];

beforeEach(() => {
	server.use(setupAuthzAdmin());
});

afterEach(() => {
	server.resetHandlers();
});

async function openWizard(
	user: User,
	resource: AuthZResource = 'logs',
): Promise<jest.MockedFunction<OnAdd>> {
	const onAdd = jest.fn() as jest.MockedFunction<OnAdd>;
	render(
		<TelemetrySelectorWizard
			resource={resource}
			testId={`${resource}-read`}
			onAdd={onAdd}
		/>,
	);

	await user.click(
		screen.getByTestId(`telemetry-wizard-trigger-${resource}-read`),
	);
	await screen.findByTestId(`telemetry-wizard-dialog-${resource}-read`);
	return onAdd;
}

async function typeSelector(user: User, selector: string): Promise<void> {
	await user.clear(screen.getByTestId('wizard-selector-input-logs-read-field'));
	await user.paste(selector);
}

describe('PermissionEditor - TelemetrySelectorWizard', () => {
	describe('in the permission editor', () => {
		it('shows wizard button for telemetry resources', async () => {
			const user = userEvent.setup();
			await selectOnlySelected(user, 'logs');

			expect(
				screen.getByTestId('telemetry-wizard-trigger-logs-read'),
			).toBeInTheDocument();
		});

		it('does not show wizard button for non-telemetry resources', async () => {
			const user = userEvent.setup();
			await selectOnlySelected(user, 'factor-api-key');

			expect(
				within(screen.getByTestId('resource-card-factor-api-key')).queryByTestId(
					'telemetry-wizard-trigger-factor-api-key-read',
				),
			).not.toBeInTheDocument();
		});

		it('adds a query-type wildcard when the value is left empty', async () => {
			const user = userEvent.setup();
			await selectOnlySelected(user, 'logs');

			await user.click(screen.getByTestId('telemetry-wizard-trigger-logs-read'));
			await user.click(await screen.findByTestId('wizard-add-btn-logs-read'));

			await expect(
				screen.findByText('builder_query/*'),
			).resolves.toBeInTheDocument();
		});
	});

	it('does not add duplicate selectors', async () => {
		const user = userEvent.setup();
		const onSelectedIdsChange =
			jest.fn() as jest.MockedFunction<OnSelectedIdsChange>;
		render(
			<ActionToggle
				action="read"
				resource="logs"
				scope={PermissionScope.ONLY_SELECTED}
				selectedIds={['builder_query/*']}
				canSelectIndividually
				onScopeChange={jest.fn()}
				onSelectedIdsChange={onSelectedIdsChange}
			/>,
		);

		await user.click(screen.getByTestId('telemetry-wizard-trigger-logs-read'));
		await user.click(await screen.findByTestId('wizard-add-btn-logs-read'));

		expect(onSelectedIdsChange).not.toHaveBeenCalled();
	});

	it('opens wizard dialog when trigger clicked', async () => {
		const user = userEvent.setup();
		render(
			<TelemetrySelectorWizard
				resource="logs"
				testId="logs-read"
				onAdd={jest.fn()}
			/>,
		);

		await user.click(screen.getByTestId('telemetry-wizard-trigger-logs-read'));

		await expect(
			screen.findByTestId('telemetry-wizard-dialog-logs-read'),
		).resolves.toBeInTheDocument();
	});

	it('does not offer builder sub query', async () => {
		const user = userEvent.setup();
		await openWizard(user);

		await user.click(screen.getByTestId('wizard-query-type-select-logs-read'));

		expect(screen.queryByText('Builder Sub Query')).not.toBeInTheDocument();
	});

	it('does not show PromQL for logs', async () => {
		const user = userEvent.setup();
		await openWizard(user);

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
		const onAdd = await openWizard(user, 'metrics');

		await user.click(screen.getByTestId('wizard-query-type-select-metrics-read'));
		await user.click(
			await screen.findByTestId('wizard-query-type-option-promql-metrics-read'),
		);

		await user.click(screen.getByTestId('wizard-add-btn-metrics-read'));

		expect(onAdd).toHaveBeenCalledWith('promql/*');
	});

	it('defaults the key to signoz.workspace.key.id', async () => {
		const user = userEvent.setup();
		await openWizard(user);

		expect(screen.getByTestId('wizard-key-select-logs-read')).toHaveTextContent(
			'signoz.workspace.key.id',
		);
	});

	it('rewrites the selector when another key is picked', async () => {
		const user = userEvent.setup();
		const onAdd = await openWizard(user);

		await user.type(
			screen.getByTestId('wizard-value-input-logs-read-field'),
			'checkout',
		);
		await user.click(screen.getByTestId('wizard-key-select-logs-read'));
		await user.click(
			await screen.findByTestId(
				'wizard-key-option-resource.service.name-logs-read',
			),
		);

		expect(
			screen.getByTestId('wizard-selector-input-logs-read-field'),
		).toHaveValue('builder_query/resource.service.name/checkout');

		await user.click(screen.getByTestId('wizard-add-btn-logs-read'));

		expect(onAdd).toHaveBeenCalledWith(
			'builder_query/resource.service.name/checkout',
		);
	});

	it('folds the resource prefix of the workspace key from a typed selector', async () => {
		const user = userEvent.setup();
		await openWizard(user);

		await typeSelector(
			user,
			'builder_query/resource.signoz.workspace.key.id/key-a',
		);

		expect(screen.getByTestId('wizard-key-select-logs-read')).toHaveTextContent(
			'signoz.workspace.key.id',
		);

		await user.type(
			screen.getByTestId('wizard-value-input-logs-read-field'),
			'2',
		);

		expect(
			screen.getByTestId('wizard-selector-input-logs-read-field'),
		).toHaveValue('builder_query/signoz.workspace.key.id/key-a2');
	});

	it('accepts the resource-prefixed workspace key in the hint', async () => {
		const user = userEvent.setup();
		await openWizard(user);

		await typeSelector(
			user,
			'builder_query/resource.signoz.workspace.key.id/key-a',
		);

		expect(
			screen.getByTestId('wizard-selector-hint-logs-read'),
		).toHaveTextContent(
			'Allow signoz.workspace.key.id=key-a for Builder Query queries.',
		);
	});

	it('selects the key from a typed selector', async () => {
		const user = userEvent.setup();
		await openWizard(user);

		await typeSelector(
			user,
			'builder_query/resource.deployment.environment.name/prod',
		);

		expect(screen.getByTestId('wizard-key-select-logs-read')).toHaveTextContent(
			'resource.deployment.environment.name',
		);
		expect(screen.getByTestId('wizard-value-input-logs-read-field')).toHaveValue(
			'prod',
		);
	});

	it('hints when a typed selector uses an unsupported key', async () => {
		const user = userEvent.setup();
		await openWizard(user);

		await typeSelector(user, 'builder_query/host.name/web-1');

		expect(screen.getByTestId('wizard-key-select-logs-read')).toHaveTextContent(
			'signoz.workspace.key.id',
		);
		expect(
			screen.getByTestId('wizard-selector-hint-logs-read'),
		).toHaveTextContent('"host.name" is not a supported key.');
	});

	it('hides Key field for query types that do not support key scoping', async () => {
		const user = userEvent.setup();
		await openWizard(user);

		await user.click(screen.getByTestId('wizard-query-type-select-logs-read'));
		await user.click(
			await screen.findByTestId(
				'wizard-query-type-option-clickhouse_sql-logs-read',
			),
		);

		expect(
			screen.queryByTestId('wizard-key-select-logs-read'),
		).not.toBeInTheDocument();
	});

	it('adds a key-scoped selector when the value is filled', async () => {
		const user = userEvent.setup();
		const onAdd = await openWizard(user);

		await user.type(
			screen.getByTestId('wizard-value-input-logs-read-field'),
			'123',
		);

		expect(
			screen.getByTestId('wizard-selector-input-logs-read-field'),
		).toHaveValue('builder_query/signoz.workspace.key.id/123');

		await user.click(screen.getByTestId('wizard-add-btn-logs-read'));

		expect(onAdd).toHaveBeenCalledWith(
			'builder_query/signoz.workspace.key.id/123',
		);
	});

	it('replaces the value with a wildcard when any resource is checked', async () => {
		const user = userEvent.setup();
		const onAdd = await openWizard(user);

		await user.click(
			screen.getByTestId('wizard-any-resource-checkbox-logs-read'),
		);

		expect(screen.getByTestId('wizard-value-input-logs-read-field')).toHaveValue(
			'*',
		);

		await user.click(screen.getByTestId('wizard-add-btn-logs-read'));

		expect(onAdd).toHaveBeenCalledWith('builder_query/signoz.workspace.key.id/*');
	});

	it('clears the value when any resource is unchecked', async () => {
		const user = userEvent.setup();
		await openWizard(user);

		const anyResource = screen.getByTestId(
			'wizard-any-resource-checkbox-logs-read',
		);
		await user.click(anyResource);
		expect(anyResource).toBeChecked();

		await user.click(anyResource);

		expect(anyResource).not.toBeChecked();
		expect(screen.getByTestId('wizard-value-input-logs-read-field')).toHaveValue(
			'',
		);
	});

	it('checks any resource when the value is typed as a wildcard', async () => {
		const user = userEvent.setup();
		await openWizard(user);

		await user.type(
			screen.getByTestId('wizard-value-input-logs-read-field'),
			'*',
		);

		expect(
			screen.getByTestId('wizard-any-resource-checkbox-logs-read'),
		).toBeChecked();
	});

	it('disables value scoping for query types that do not support it', async () => {
		const user = userEvent.setup();
		await openWizard(user);

		await user.click(screen.getByTestId('wizard-query-type-select-logs-read'));
		await user.click(
			await screen.findByTestId(
				'wizard-query-type-option-clickhouse_sql-logs-read',
			),
		);

		expect(
			screen.getByTestId('wizard-value-input-logs-read-field'),
		).toBeDisabled();
		expect(
			screen.getByTestId('wizard-any-resource-checkbox-logs-read'),
		).toHaveAttribute('aria-disabled', 'true');
	});

	it('clears the value when switching to a query type without key scoping', async () => {
		const user = userEvent.setup();
		const onAdd = await openWizard(user);

		await user.type(
			screen.getByTestId('wizard-value-input-logs-read-field'),
			'123',
		);

		await user.click(screen.getByTestId('wizard-query-type-select-logs-read'));
		await user.click(
			await screen.findByTestId(
				'wizard-query-type-option-clickhouse_sql-logs-read',
			),
		);

		expect(screen.getByTestId('wizard-value-input-logs-read-field')).toHaveValue(
			'',
		);
		expect(
			screen.getByTestId('wizard-selector-input-logs-read-field'),
		).toHaveValue('clickhouse_sql/*');

		await user.click(screen.getByTestId('wizard-add-btn-logs-read'));

		expect(onAdd).toHaveBeenCalledWith('clickhouse_sql/*');
	});

	it('follows a hand-edited selector on the query type and value inputs', async () => {
		const user = userEvent.setup();
		await openWizard(user);

		await typeSelector(user, 'clickhouse_sql/signoz.workspace.key.id/checkout');

		expect(
			screen.getByTestId('wizard-query-type-select-logs-read'),
		).toHaveTextContent('ClickHouse SQL');
		expect(screen.getByTestId('wizard-value-input-logs-read-field')).toHaveValue(
			'checkout',
		);
	});

	it('checks any resource when the selector is edited to a wildcard value', async () => {
		const user = userEvent.setup();
		await openWizard(user);

		await typeSelector(user, 'builder_query/signoz.workspace.key.id/*');

		expect(
			screen.getByTestId('wizard-any-resource-checkbox-logs-read'),
		).toBeChecked();
	});

	it('restores the selected key in the selector once the value changes', async () => {
		const user = userEvent.setup();
		await openWizard(user);

		await typeSelector(user, 'builder_query/host.name/web-1');

		await user.type(
			screen.getByTestId('wizard-value-input-logs-read-field'),
			'2',
		);

		expect(
			screen.getByTestId('wizard-selector-input-logs-read-field'),
		).toHaveValue('builder_query/signoz.workspace.key.id/web-12');
		expect(screen.getByTestId('wizard-add-btn-logs-read')).not.toHaveAttribute(
			'aria-disabled',
			'true',
		);
	});

	it('blocks adding when the selector has an unknown query type', async () => {
		const user = userEvent.setup();
		await openWizard(user);

		await typeSelector(user, 'sql_query/*');

		expect(
			screen.getByTestId('wizard-selector-hint-logs-read'),
		).toHaveTextContent('"sql_query" is not a supported query type.');
		expect(screen.getByTestId('wizard-add-btn-logs-read')).toHaveAttribute(
			'aria-disabled',
			'true',
		);
	});

	it('blocks adding when the selector is emptied', async () => {
		const user = userEvent.setup();
		await openWizard(user);

		await user.clear(screen.getByTestId('wizard-selector-input-logs-read-field'));

		expect(
			screen.getByTestId('wizard-selector-hint-logs-read'),
		).toHaveTextContent('Enter a selector.');
		expect(screen.getByTestId('wizard-add-btn-logs-read')).toHaveAttribute(
			'aria-disabled',
			'true',
		);
	});

	it('adds the hand-edited selector verbatim', async () => {
		const user = userEvent.setup();
		const onAdd = await openWizard(user);

		await typeSelector(user, 'builder_query/signoz.workspace.key.id/a/b');

		await user.click(screen.getByTestId('wizard-add-btn-logs-read'));

		expect(onAdd).toHaveBeenCalledWith(
			'builder_query/signoz.workspace.key.id/a/b',
		);
	});

	it('closes dialog after adding selector', async () => {
		const user = userEvent.setup();
		await openWizard(user);

		await user.click(screen.getByTestId('wizard-add-btn-logs-read'));

		await waitFor(() => {
			expect(
				screen.queryByTestId('telemetry-wizard-dialog-logs-read'),
			).not.toBeInTheDocument();
		});
	});

	it('resets wizard state when dialog is closed and reopened', async () => {
		const user = userEvent.setup();
		await openWizard(user);

		await user.type(
			screen.getByTestId('wizard-value-input-logs-read-field'),
			'123',
		);
		await user.click(screen.getByTestId('wizard-query-type-select-logs-read'));
		await user.click(
			await screen.findByTestId(
				'wizard-query-type-option-clickhouse_sql-logs-read',
			),
		);

		await user.click(screen.getByTestId('wizard-cancel-btn-logs-read'));

		await waitFor(() => {
			expect(
				screen.queryByTestId('telemetry-wizard-dialog-logs-read'),
			).not.toBeInTheDocument();
		});

		await user.click(screen.getByTestId('telemetry-wizard-trigger-logs-read'));
		const selectTrigger = await screen.findByTestId(
			'wizard-query-type-select-logs-read',
		);

		expect(selectTrigger).toHaveTextContent('Builder Query');
		expect(screen.getByTestId('wizard-value-input-logs-read-field')).toHaveValue(
			'',
		);
		expect(
			screen.getByTestId('wizard-selector-input-logs-read-field'),
		).toHaveValue('builder_query/*');
	});

	it('previews the query-type wildcard while the value is empty', async () => {
		const user = userEvent.setup();
		await openWizard(user);

		expect(
			screen.getByTestId('wizard-selector-input-logs-read-field'),
		).toHaveValue('builder_query/*');
		expect(
			screen.getByTestId('wizard-selector-hint-logs-read'),
		).toHaveTextContent('Allow every "Builder Query" query.');
	});

	it('describes a key-scoped selector', async () => {
		const user = userEvent.setup();
		await openWizard(user);

		await user.type(
			screen.getByTestId('wizard-value-input-logs-read-field'),
			'123',
		);

		expect(
			screen.getByTestId('wizard-selector-hint-logs-read'),
		).toHaveTextContent(
			'Allow signoz.workspace.key.id=123 for Builder Query queries.',
		);
	});

	it('describes an any-resource selector', async () => {
		const user = userEvent.setup();
		await openWizard(user);

		await user.click(
			screen.getByTestId('wizard-any-resource-checkbox-logs-read'),
		);

		expect(
			screen.getByTestId('wizard-selector-hint-logs-read'),
		).toHaveTextContent(
			'Allow every signoz.workspace.key.id for Builder Query queries.',
		);
	});

	it('does not show query type descriptions', async () => {
		const user = userEvent.setup();
		await openWizard(user);

		await user.click(screen.getByTestId('wizard-query-type-select-logs-read'));

		expect(
			screen.queryByText(
				'Visual query builder for selecting data sources, filters, and aggregations',
			),
		).not.toBeInTheDocument();
	});
});
