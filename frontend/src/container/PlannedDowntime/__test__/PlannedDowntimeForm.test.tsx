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
const ALL_SCOPE_TEST_ID = 'planned-downtime-alert-scope-item-all';
const SPECIFIC_SCOPE_TEST_ID = 'planned-downtime-alert-scope-item-specific';

function scopeLabel(testId: string): HTMLElement | null {
	return screen.getByTestId(testId).closest('label');
}

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

		await expect(screen.findByTestId(ALL_SCOPE_TEST_ID)).resolves.toBeChecked();
		expect(scopeLabel(ALL_SCOPE_TEST_ID)).toHaveTextContent('All alert rules');
		expect(screen.getByTestId(SPECIFIC_SCOPE_TEST_ID)).not.toBeChecked();
		expect(scopeLabel(SPECIFIC_SCOPE_TEST_ID)).toHaveTextContent(
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
