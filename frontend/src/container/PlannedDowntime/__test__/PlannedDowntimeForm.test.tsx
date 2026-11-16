import { Form } from 'antd';
import type { AlertmanagertypesPlannedMaintenanceDTO } from 'api/generated/services/sigNoz.schemas';
import { render, screen, userEvent } from 'tests/test-utils';

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
}: {
	initialValues: Partial<AlertmanagertypesPlannedMaintenanceDTO>;
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
			isEditMode
			form={form}
		/>
	);
}

describe('PlannedDowntimeForm alert rule scope', () => {
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
