import { Form } from 'antd';
import type {
	AlertmanagertypesPlannedMaintenanceDTO,
	AuthtypesTransactionDTO,
} from 'api/generated/services/sigNoz.schemas';
import { updateDowntimeScheduleByID } from 'api/generated/services/downtimeschedules';
import { render, screen, userEvent, waitFor, within } from 'tests/test-utils';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import {
	AUTHZ_CHECK_URL,
	authzMockResponse,
	setupAuthzAdmin,
	setupAuthzAllow,
	setupAuthzDeny,
} from 'lib/authz/utils/authz-test-utils';
import {
	buildPlannedMaintenanceAttachPermission,
	buildPlannedMaintenanceDetachPermission,
	buildPlannedMaintenanceUpdatePermission,
	PlannedMaintenanceAttachPermission,
	PlannedMaintenanceCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/planned-maintenance.permissions';
import {
	buildRuleAttachPermission,
	buildRuleDetachPermission,
	RuleListPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';
import { gettableTransactionToPermission } from 'lib/authz/hooks/useAuthZ/utils';

import { PlannedDowntimeForm } from '../PlannedDowntimeForm';
import { createMockDowntime } from './testUtils';

jest.mock('api/generated/services/downtimeschedules', () => ({
	createDowntimeSchedule: jest.fn(),
	updateDowntimeScheduleByID: jest.fn(),
}));

const ALERT_OPTIONS = [
	{ label: 'High CPU', value: 'rule-1' },
	{ label: 'Disk full', value: 'rule-2' },
];

const RULE_PICKER_PLACEHOLDER = 'Search for alert rules or groups...';
const ALL_SCOPE_TEST_ID = 'planned-downtime-alert-scope-item-all';
const SPECIFIC_SCOPE_TEST_ID = 'planned-downtime-alert-scope-item-specific';

function FormHarness({
	initialValues,
	isEditMode = true,
	alertOptions = ALERT_OPTIONS,
	isError = false,
}: {
	initialValues: Partial<AlertmanagertypesPlannedMaintenanceDTO>;
	isEditMode?: boolean;
	alertOptions?: typeof ALERT_OPTIONS;
	isError?: boolean;
}): JSX.Element {
	const [form] = Form.useForm();
	return (
		<PlannedDowntimeForm
			initialValues={initialValues}
			alertOptions={alertOptions}
			isError={isError}
			isLoading={false}
			isOpen
			setIsOpen={jest.fn()}
			refetchAllSchedules={jest.fn()}
			isEditMode={isEditMode}
			form={form}
		/>
	);
}

describe('PlannedDowntimeForm alert rule scope', () => {
	beforeEach(() => {
		server.use(setupAuthzAdmin());
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('checks "All alert rules" when editing a downtime with no alert ids', async () => {
		render(
			<FormHarness
				initialValues={createMockDowntime({
					id: 'd1',
					name: 'Nightly',
					alertIds: [],
				})}
			/>,
		);

		await expect(screen.findByTestId(ALL_SCOPE_TEST_ID)).resolves.toBeChecked();
		expect(screen.getByTestId(ALL_SCOPE_TEST_ID)).toHaveAccessibleName(
			'All alert rules',
		);
		expect(screen.getByTestId(SPECIFIC_SCOPE_TEST_ID)).not.toBeChecked();
		expect(screen.getByTestId(SPECIFIC_SCOPE_TEST_ID)).toHaveAccessibleName(
			'Specific alert rules',
		);
		expect(screen.queryByText(RULE_PICKER_PLACEHOLDER)).not.toBeInTheDocument();
	});

	it('shows the rule picker after switching to specific alert rules', async () => {
		const user = userEvent.setup();
		render(
			<FormHarness
				initialValues={createMockDowntime({
					id: 'd1',
					name: 'Nightly',
					alertIds: [],
				})}
			/>,
		);

		await user.click(await screen.findByTestId(SPECIFIC_SCOPE_TEST_ID));

		expect(screen.getByTestId(SPECIFIC_SCOPE_TEST_ID)).toBeChecked();
		expect(screen.getByText(RULE_PICKER_PLACEHOLDER)).toBeInTheDocument();
	});

	it('checks "Specific alert rules" and lists them when editing a scoped downtime', async () => {
		render(
			<FormHarness
				initialValues={createMockDowntime({
					id: 'd2',
					name: 'Scoped',
					alertIds: ['rule-1'],
				})}
			/>,
		);

		await expect(
			screen.findByTestId(SPECIFIC_SCOPE_TEST_ID),
		).resolves.toBeChecked();
		expect(screen.getByText('High CPU')).toBeInTheDocument();
	});
});

describe('PlannedDowntimeForm seeding', () => {
	const NEW_DOWNTIME = {};

	beforeEach(() => {
		server.use(setupAuthzAdmin());
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('keeps typed values when the parent re-renders with no rules', async () => {
		const user = userEvent.setup();
		const { rerender } = render(
			<FormHarness
				initialValues={NEW_DOWNTIME}
				isEditMode={false}
				alertOptions={[]}
			/>,
		);

		await user.type(await screen.findByTestId('downtime-name'), 'Upgrade');
		rerender(
			<FormHarness
				initialValues={NEW_DOWNTIME}
				isEditMode={false}
				alertOptions={[]}
			/>,
		);

		expect(screen.getByTestId('downtime-name')).toHaveValue('Upgrade');
	});
});

describe('PlannedDowntimeForm authz', () => {
	const ID = 'd1';
	const SAVE = 'downtime-save';
	const UPDATE = buildPlannedMaintenanceUpdatePermission(ID);
	const scoped = createMockDowntime({
		id: ID,
		name: 'Nightly',
		alertIds: ['rule-1'],
	});
	const allRules = createMockDowntime({ id: ID, name: 'Nightly', alertIds: [] });

	afterEach(() => {
		server.resetHandlers();
	});

	type User = ReturnType<typeof userEvent.setup>;
	const setupUser = (): User => userEvent.setup({ pointerEventsCheck: 0 });

	const deniedOnSave = (): string | null =>
		screen.getByTestId(SAVE).getAttribute('data-denied-permissions');

	const openRulePicker = async (user: User): Promise<void> => {
		// antd's search input is the only markup of the picker that opens it
		await user.click(
			within(await screen.findByTestId('downtime-alert-rules')).getByRole(
				'combobox',
			),
		);
	};

	const findRuleOption = async (
		user: User,
		ruleId: string,
	): Promise<HTMLElement> => {
		await openRulePicker(user);
		return screen.findByTestId(`downtime-rule-option-${ruleId}`);
	};

	it('opens read-only with Save disabled without update', async () => {
		server.use(setupAuthzDeny(UPDATE));
		render(<FormHarness initialValues={scoped} />);

		await waitFor(() =>
			expect(screen.getByDisplayValue('Nightly')).toBeDisabled(),
		);
		expect(screen.getByTestId(SAVE)).toHaveAttribute('aria-disabled', 'true');
	});

	it('locks the rule scope without update', async () => {
		server.use(setupAuthzDeny(UPDATE));
		const user = setupUser();
		render(<FormHarness initialValues={scoped} />);

		await waitFor(() =>
			expect(screen.getByTestId('downtime-name')).toBeDisabled(),
		);
		await user.click(screen.getByTestId(ALL_SCOPE_TEST_ID));

		expect(
			screen.getByTestId(SPECIFIC_SCOPE_TEST_ID),
		).toHaveAttribute('aria-checked', 'true');
	});

	it('saves an unchanged scoped schedule with update alone', async () => {
		server.use(setupAuthzAllow(UPDATE));
		render(<FormHarness initialValues={scoped} />);

		await waitFor(() =>
			expect(screen.getByTestId(SAVE)).toHaveAttribute('aria-disabled', 'false'),
		);
		expect(screen.getByDisplayValue('Nightly')).toBeEnabled();
	});

	it('re-saves an all-rules schedule with update alone', async () => {
		server.use(setupAuthzAllow(UPDATE));
		render(<FormHarness initialValues={allRules} />);

		await waitFor(() =>
			expect(screen.getByTestId(SAVE)).toHaveAttribute('aria-disabled', 'false'),
		);
		expect(deniedOnSave()).toBeNull();
	});

	it('needs attach on every rule and detach on the old ones when widening to all', async () => {
		const user = setupUser();
		server.use(setupAuthzAllow(UPDATE));
		render(<FormHarness initialValues={scoped} />);
		await user.click(
			await screen.findByRole('radio', { name: 'All alert rules' }),
		);

		await waitFor(() =>
			expect(deniedOnSave()).toBe(
				[
					buildPlannedMaintenanceAttachPermission(ID),
					buildRuleAttachPermission('*'),
					buildPlannedMaintenanceDetachPermission(ID),
					buildRuleDetachPermission('rule-1'),
				].join(','),
			),
		);
	});

	it('needs attach on every rule to create one for all rules', async () => {
		const user = setupUser();
		server.use(
			setupAuthzAllow(
				PlannedMaintenanceCreatePermission,
				PlannedMaintenanceAttachPermission,
			),
		);
		render(<FormHarness initialValues={{ alertIds: [] }} isEditMode={false} />);
		await user.click(
			await screen.findByRole('radio', { name: 'All alert rules' }),
		);

		await waitFor(() =>
			expect(deniedOnSave()).toBe(buildRuleAttachPermission('*')),
		);
	});

	it('needs no rule attach to create one before a rule is picked', async () => {
		server.use(
			setupAuthzAllow(
				PlannedMaintenanceCreatePermission,
				PlannedMaintenanceAttachPermission,
			),
		);
		render(<FormHarness initialValues={{ alertIds: [] }} isEditMode={false} />);

		await waitFor(() =>
			expect(screen.getByTestId(SAVE)).toHaveAttribute('aria-disabled', 'false'),
		);
	});

	it('checks unsilenced rules only once the picker opens', async () => {
		const requested: AuthtypesTransactionDTO[] = [];
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = (await req.json()) as AuthtypesTransactionDTO[];
				requested.push(...payload);
				return res(
					ctx.status(200),
					ctx.json(
						authzMockResponse(
							payload,
							payload.map(() => true),
						),
					),
				);
			}),
		);
		const isRule2Attach = (txn: AuthtypesTransactionDTO): boolean =>
			txn.relation === 'attach' &&
			txn.object.resource.kind === 'rule' &&
			txn.object.selector === 'rule-2';
		const user = setupUser();
		render(<FormHarness initialValues={scoped} />);
		await waitFor(() =>
			expect(screen.getByTestId(SAVE)).toHaveAttribute('aria-disabled', 'false'),
		);

		expect(requested.some(isRule2Attach)).toBe(false);

		const option = await findRuleOption(user, 'rule-2');
		await waitFor(() => expect(option).toHaveAttribute('aria-disabled', 'false'));
		expect(requested.some(isRule2Attach)).toBe(true);
	});

	it('disables a rule the user cannot attach, naming the permission', async () => {
		const user = setupUser();
		server.use(setupAuthzDeny(buildRuleAttachPermission('rule-2')));
		render(<FormHarness initialValues={scoped} />);
		await waitFor(() =>
			expect(screen.getByTestId(SAVE)).toHaveAttribute('aria-disabled', 'false'),
		);

		const option = await findRuleOption(user, 'rule-2');
		await waitFor(() =>
			expect(option).toHaveAttribute(
				'title',
				expect.stringContaining('attach:rule:rule-2'),
			),
		);
		expect(option).toHaveAttribute('aria-disabled', 'true');
	});

	it('keeps a rule disabled while its check is pending', async () => {
		const user = setupUser();
		server.use(
			rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => res(ctx.delay('infinite'))),
		);
		render(<FormHarness initialValues={{ alertIds: [] }} isEditMode={false} />);

		const option = await findRuleOption(user, 'rule-2');
		expect(option).toHaveAttribute('aria-disabled', 'true');
		expect(option).toHaveAttribute('title', 'Checking permissions');
	});

	it('locks a silenced rule the user cannot detach, naming the permission', async () => {
		const user = setupUser();
		server.use(setupAuthzDeny(buildRuleDetachPermission('rule-1')));
		render(<FormHarness initialValues={scoped} />);

		await user.hover(await screen.findByTestId('alert-rule-tag-locked-rule-1'));
		await expect(
			screen.findByText(/detach:rule:rule-1/),
		).resolves.toBeInTheDocument();
	});

	it('keeps a silenced rule removable with detach', async () => {
		server.use(setupAuthzAdmin());
		render(<FormHarness initialValues={scoped} />);

		await waitFor(() =>
			expect(
				screen.queryByTestId('alert-rule-tag-locked-rule-1'),
			).not.toBeInTheDocument(),
		);
		expect(screen.getByText('High CPU')).toBeInTheDocument();
	});

	it('leaves rules pickable when the check fails', async () => {
		const user = setupUser();
		server.use(
			rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => res(ctx.status(500))),
		);
		render(<FormHarness initialValues={{ alertIds: [] }} isEditMode={false} />);

		const option = await findRuleOption(user, 'rule-2');
		await waitFor(() => expect(option).toHaveAttribute('aria-disabled', 'false'));
	});

	it('keeps a denied silenced rule locked when only the picker check fails', async () => {
		const user = setupUser();
		const pickerCheck = buildRuleAttachPermission('rule-2');
		const denied = buildRuleDetachPermission('rule-1');
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = (await req.json()) as AuthtypesTransactionDTO[];
				const permissions = payload.map(gettableTransactionToPermission);
				if (permissions.includes(pickerCheck)) {
					return res(ctx.status(500));
				}
				return res(
					ctx.json(
						authzMockResponse(
							payload,
							permissions.map((permission) => permission !== denied),
						),
					),
				);
			}),
		);
		render(<FormHarness initialValues={scoped} />);

		const option = await findRuleOption(user, 'rule-2');
		await waitFor(() => expect(option).toHaveAttribute('aria-disabled', 'false'));
		expect(
			screen.getByTestId('alert-rule-tag-locked-rule-1'),
		).toBeInTheDocument();
	});

	it('explains an empty picker without rule:list', async () => {
		const user = setupUser();
		server.use(setupAuthzDeny(RuleListPermission));
		render(
			<FormHarness
				initialValues={{ alertIds: [] }}
				isEditMode={false}
				alertOptions={[]}
				isError
			/>,
		);
		await openRulePicker(user);

		await expect(
			screen.findByTestId('downtime-rules-denied'),
		).resolves.toHaveTextContent('list:rule:*');
	});

	it('keeps the silenced rules when the rule list did not load', async () => {
		const user = setupUser();
		server.use(setupAuthzDeny(RuleListPermission));
		render(
			<FormHarness
				initialValues={createMockDowntime({
					id: ID,
					name: 'Nightly',
					alertIds: ['rule-1'],
					schedule: {
						timezone: 'UTC',
						startTime: '2024-01-01',
						endTime: '2024-01-02',
					},
				})}
				alertOptions={[]}
				isError
			/>,
		);

		await expect(screen.findByText('rule-1')).resolves.toBeInTheDocument();
		await waitFor(() =>
			expect(screen.getByTestId(SAVE)).toHaveAttribute('aria-disabled', 'false'),
		);
		await user.click(screen.getByTestId(SAVE));

		await waitFor(() =>
			expect(jest.mocked(updateDowntimeScheduleByID)).toHaveBeenCalledWith(
				{ id: ID },
				expect.objectContaining({ alertIds: ['rule-1'] }),
			),
		);
	});
});
