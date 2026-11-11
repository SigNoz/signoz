import { Form } from 'antd';
import type { AlertmanagertypesPlannedMaintenanceDTO } from 'api/generated/services/sigNoz.schemas';
import {
	fireEvent,
	render,
	screen,
	userEvent,
	waitFor,
} from 'tests/test-utils';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import {
	AUTHZ_CHECK_URL,
	setupAuthzAdmin,
	setupAuthzAllow,
	setupAuthzDeny,
} from 'lib/authz/utils/authz-test-utils';
import {
	buildPlannedMaintenanceDetachPermission,
	buildPlannedMaintenanceReadPermission,
	buildPlannedMaintenanceUpdatePermission,
	PlannedMaintenanceAttachPermission,
	PlannedMaintenanceCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/planned-maintenance.permissions';
import {
	buildRuleAttachPermission,
	buildRuleDetachPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';

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

function FormHarness({
	initialValues,
	isEditMode = true,
}: {
	initialValues: Partial<AlertmanagertypesPlannedMaintenanceDTO>;
	isEditMode?: boolean;
}): JSX.Element {
	const [form] = Form.useForm();
	return (
		<PlannedDowntimeForm
			initialValues={initialValues}
			alertOptions={ALERT_OPTIONS}
			isError={false}
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

		await expect(
			screen.findByRole('radio', { name: 'All alert rules' }),
		).resolves.toBeChecked();
		expect(
			screen.getByRole('radio', { name: 'Specific alert rules' }),
		).not.toBeChecked();
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

		await user.click(
			await screen.findByRole('radio', { name: 'Specific alert rules' }),
		);

		expect(
			screen.getByRole('radio', { name: 'Specific alert rules' }),
		).toBeChecked();
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
			screen.findByRole('radio', { name: 'Specific alert rules' }),
		).resolves.toBeChecked();
		expect(screen.getByText('High CPU')).toBeInTheDocument();
	});
});

describe('PlannedDowntimeForm authz', () => {
	const ID = 'd1';
	const SAVE = 'downtime-save';
	const EDIT = [
		buildPlannedMaintenanceReadPermission(ID),
		buildPlannedMaintenanceUpdatePermission(ID),
	];
	const scoped = createMockDowntime({
		id: ID,
		name: 'Nightly',
		alertIds: ['rule-1'],
	});
	const allRules = createMockDowntime({ id: ID, name: 'Nightly', alertIds: [] });

	afterEach(() => {
		server.resetHandlers();
	});

	const deniedOnSave = (): string | null =>
		screen.getByTestId(SAVE).getAttribute('data-denied-permissions');

	it('opens read-only with Save disabled without update', async () => {
		server.use(setupAuthzAllow(buildPlannedMaintenanceReadPermission(ID)));
		render(<FormHarness initialValues={scoped} />);

		await waitFor(() =>
			expect(screen.getByDisplayValue('Nightly')).toBeDisabled(),
		);
		expect(screen.getByTestId(SAVE)).toBeDisabled();
	});

	it('saves an unchanged scoped schedule with read and update alone', async () => {
		server.use(setupAuthzAllow(...EDIT));
		render(<FormHarness initialValues={scoped} />);

		await waitFor(() => expect(screen.getByTestId(SAVE)).toBeEnabled());
		expect(screen.getByDisplayValue('Nightly')).toBeEnabled();
	});

	it('needs detach on every rule to re-save an all-rules schedule', async () => {
		server.use(setupAuthzAllow(...EDIT));
		render(<FormHarness initialValues={allRules} />);

		await waitFor(() =>
			expect(deniedOnSave()).toBe(
				[
					buildPlannedMaintenanceDetachPermission(ID),
					buildRuleDetachPermission('*'),
				].join(','),
			),
		);
	});

	it('needs detach on the old rules when widening to all rules', async () => {
		server.use(setupAuthzAllow(...EDIT));
		render(<FormHarness initialValues={scoped} />);
		await userEvent.click(
			await screen.findByRole('radio', { name: 'All alert rules' }),
		);

		await waitFor(() =>
			expect(deniedOnSave()).toBe(
				[
					buildPlannedMaintenanceDetachPermission(ID),
					buildRuleDetachPermission('rule-1'),
				].join(','),
			),
		);
	});

	it('needs attach on every rule to create one for all rules', async () => {
		server.use(
			setupAuthzAllow(
				PlannedMaintenanceCreatePermission,
				PlannedMaintenanceAttachPermission,
			),
		);
		render(<FormHarness initialValues={{ alertIds: [] }} isEditMode={false} />);
		await userEvent.click(
			await screen.findByRole('radio', { name: 'All alert rules' }),
		);

		await waitFor(() =>
			expect(deniedOnSave()).toBe(buildRuleAttachPermission('*')),
		);
	});

	it('disables a rule the user cannot attach, naming the permission', async () => {
		server.use(setupAuthzDeny(buildRuleAttachPermission('rule-2')));
		render(<FormHarness initialValues={scoped} />);
		await waitFor(() => expect(screen.getByTestId(SAVE)).toBeEnabled());

		const picker = screen.getByTestId('downtime-alert-rules');
		fireEvent.mouseDown(picker.querySelector('.ant-select-selector') ?? picker);
		const option = (await screen.findAllByText('Disk full'))
			.map((el) => el.closest<HTMLElement>('.ant-select-item-option'))
			.find(Boolean);

		await waitFor(() =>
			expect(option).toHaveClass('ant-select-item-option-disabled'),
		);
		expect(option?.getAttribute('title')).toContain('attach:rule:rule-2');
	});

	it('locks a linked rule the user cannot detach', async () => {
		server.use(setupAuthzDeny(buildRuleDetachPermission('rule-1')));
		render(<FormHarness initialValues={scoped} />);

		await expect(
			screen.findByTestId('alert-rule-tag-locked-rule-1'),
		).resolves.toBeInTheDocument();
	});

	it('leaves rules pickable when the check fails', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => res(ctx.status(500))),
		);
		render(<FormHarness initialValues={{ alertIds: [] }} isEditMode={false} />);

		const picker = await screen.findByTestId('downtime-alert-rules');
		fireEvent.mouseDown(picker.querySelector('.ant-select-selector') ?? picker);
		const option = (await screen.findAllByText('Disk full'))
			.map((el) => el.closest<HTMLElement>('.ant-select-item-option'))
			.find(Boolean);
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(option).not.toHaveClass('ant-select-item-option-disabled');
	});

	it('keeps a linked rule removable with detach', async () => {
		server.use(setupAuthzAdmin());
		render(<FormHarness initialValues={scoped} />);

		await waitFor(() => expect(screen.getByTestId(SAVE)).toBeEnabled());
		expect(
			screen.queryByTestId('alert-rule-tag-locked-rule-1'),
		).not.toBeInTheDocument();
	});
});
