import setRetentionApiV2 from 'api/settings/setRetentionV2';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import {
	fireEvent,
	render,
	screen,
	userEvent,
	waitFor,
} from 'tests/test-utils';
import { IDiskType } from 'types/api/disks/getDisks';
import {
	PayloadPropsLogs,
	PayloadPropsMetrics,
	PayloadPropsTraces,
} from 'types/api/settings/getRetention';

import GeneralSettings from '../GeneralSettings';

// Mock dependencies
jest.mock('api/settings/setRetentionV2');

const mockNotifications = {
	error: jest.fn(),
	success: jest.fn(),
};

jest.mock('hooks/useNotifications', () => ({
	useNotifications: (): { notifications: typeof mockNotifications } => ({
		notifications: mockNotifications,
	}),
}));

jest.mock('hooks/useComponentPermission', () => ({
	__esModule: true,
	default: jest.fn(() => [true]),
}));

jest.mock('hooks/useGetTenantLicense', () => ({
	useGetTenantLicense: jest.fn(() => ({
		isCloudUser: false,
	})),
}));

jest.mock('container/GeneralSettingsCloud', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="general-settings-cloud" />,
}));

jest.mock('container/CustomDomainSettings', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="custom-domain-settings" />,
}));

// Mock data
const mockMetricsRetention: PayloadPropsMetrics = {
	metrics_ttl_duration_hrs: 168,
	metrics_move_ttl_duration_hrs: -1,
	status: '',
};

const mockTracesRetention: PayloadPropsTraces = {
	traces_ttl_duration_hrs: 168,
	traces_move_ttl_duration_hrs: -1,
	status: '',
};

const mockLogsRetentionWithS3: PayloadPropsLogs = {
	version: 'v2',
	default_ttl_days: 30,
	cold_storage_ttl_days: 24,
	status: '',
};

const mockLogsRetentionWithoutS3: PayloadPropsLogs = {
	version: 'v2',
	default_ttl_days: 30,
	cold_storage_ttl_days: -1,
	status: '',
};

const mockDisksWithS3: IDiskType[] = [
	{
		name: 'default',
		type: 's3',
	},
];

const mockDisksWithObjectStorage: IDiskType[] = [
	{
		name: 'default',
		type: 'ObjectStorage',
	},
];

const mockDisksWithoutS3: IDiskType[] = [
	{
		name: 'default',
		type: 'local',
	},
];

const getLogsRow = (): HTMLElement => {
	const logsLabel = screen.getByText('Logs');
	return logsLabel.closest('.retention-row') as HTMLElement;
};

describe('GeneralSettings - S3 Logs Retention', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(setRetentionApiV2 as jest.Mock).mockResolvedValue({
			httpStatusCode: 200,
			data: { message: 'success' },
		});
	});

	describe('Test 1: S3 Enabled - Only Days in Dropdown', () => {
		it('should show only Days option for S3 retention and send correct API payload', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(
				<GeneralSettings
					metricsTtlValuesPayload={mockMetricsRetention}
					tracesTtlValuesPayload={mockTracesRetention}
					logsTtlValuesPayload={mockLogsRetentionWithS3}
					getAvailableDiskPayload={mockDisksWithS3}
					metricsTtlValuesRefetch={jest.fn()}
					tracesTtlValuesRefetch={jest.fn()}
					logsTtlValuesRefetch={jest.fn()}
				/>,
			);

			const logsRow = getLogsRow();
			expect(logsRow).toBeInTheDocument();

			// Find all inputs in the Logs row - there should be 2 (total retention + S3)
			const inputs = logsRow.querySelectorAll('input[type="number"]');
			expect(inputs).toHaveLength(2);

			// The second input is the S3 retention field
			const s3Input = inputs[1] as HTMLInputElement;

			// Find the S3 dropdown (next sibling of the S3 input)
			const s3Dropdown = s3Input
				?.closest('.retention-row-controls')
				?.querySelectorAll('.ant-select-selector')[1] as HTMLElement;
			expect(s3Dropdown).toBeInTheDocument();

			// Click the S3 dropdown to open it
			fireEvent.mouseDown(s3Dropdown);

			// Wait for dropdown options to appear and verify only "Days" is available
			await waitFor(() => {
				const dropdownOptions = document.querySelectorAll('.ant-select-item');
				expect(dropdownOptions).toHaveLength(1);
				expect(dropdownOptions[0]).toHaveTextContent('Days');
			});

			// Close dropdown
			fireEvent.click(document.body);

			// Change S3 retention value to 5 days
			await user.clear(s3Input);
			await user.type(s3Input, '5');

			// Find the save button in the Logs row
			const saveButton = logsRow.querySelector(
				'button:not([disabled])',
			) as HTMLButtonElement;
			expect(saveButton).toBeInTheDocument();

			// Wait for button to be enabled
			await waitFor(() => {
				expect(saveButton).not.toBeDisabled();
			});

			fireEvent.click(saveButton);

			// Wait for modal to appear
			const modal = await screen.findByRole('dialog');
			expect(modal).toBeInTheDocument();

			// Click OK button
			const okButton = await screen.findByRole('button', { name: /ok/i });
			fireEvent.click(okButton);

			// Verify API was called with correct payload
			await waitFor(() => {
				expect(setRetentionApiV2).toHaveBeenCalledWith({
					type: 'logs',
					defaultTTLDays: 30,
					coldStorageVolume: 's3',
					coldStorageDurationDays: 5,
					ttlConditions: [],
				});
			});
		});

		it('should recognize ObjectStorage disk type as S3 enabled', async () => {
			render(
				<GeneralSettings
					metricsTtlValuesPayload={mockMetricsRetention}
					tracesTtlValuesPayload={mockTracesRetention}
					logsTtlValuesPayload={mockLogsRetentionWithS3}
					getAvailableDiskPayload={mockDisksWithObjectStorage}
					metricsTtlValuesRefetch={jest.fn()}
					tracesTtlValuesRefetch={jest.fn()}
					logsTtlValuesRefetch={jest.fn()}
				/>,
			);

			// Verify S3 field is visible
			const logsRow = getLogsRow();
			const inputs = logsRow.querySelectorAll('input[type="number"]');
			expect(inputs).toHaveLength(2); // Total + S3
		});
	});

	describe('Test 2: S3 Disabled - Field Hidden', () => {
		it('should hide S3 retention field and send empty S3 values to API', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(
				<GeneralSettings
					metricsTtlValuesPayload={mockMetricsRetention}
					tracesTtlValuesPayload={mockTracesRetention}
					logsTtlValuesPayload={mockLogsRetentionWithoutS3}
					getAvailableDiskPayload={mockDisksWithoutS3}
					metricsTtlValuesRefetch={jest.fn()}
					tracesTtlValuesRefetch={jest.fn()}
					logsTtlValuesRefetch={jest.fn()}
				/>,
			);

			const logsRow = getLogsRow();
			expect(logsRow).toBeInTheDocument();

			// Only 1 input should be visible (total retention, no S3)
			const inputs = logsRow.querySelectorAll('input[type="number"]');
			expect(inputs).toHaveLength(1);

			// Change total retention value
			const totalInput = inputs[0] as HTMLInputElement;

			// First, change the dropdown to Days (it defaults to Months)
			const totalDropdown = logsRow.querySelector(
				'.ant-select-selector',
			) as HTMLElement;
			await user.click(totalDropdown);

			// Wait for dropdown options to appear
			await waitFor(() => {
				const options = document.querySelectorAll('.ant-select-item');
				expect(options.length).toBeGreaterThan(0);
			});

			// Find and click the Days option
			const options = document.querySelectorAll('.ant-select-item');
			const daysOption = Array.from(options).find((opt) =>
				opt.textContent?.includes('Days'),
			);
			expect(daysOption).toBeInTheDocument();
			await user.click(daysOption as HTMLElement);

			// Now change the value
			await user.clear(totalInput);
			await user.type(totalInput, '60');

			// Find the save button
			const saveButton = logsRow.querySelector(
				'button:not([disabled])',
			) as HTMLButtonElement;
			expect(saveButton).toBeInTheDocument();

			// Wait for button to be enabled
			await waitFor(() => {
				expect(saveButton).not.toBeDisabled();
			});

			// Click save button
			await user.click(saveButton);

			// Wait for modal to appear
			const okButton = await screen.findByRole('button', { name: /ok/i });
			expect(okButton).toBeInTheDocument();

			// Click OK button
			await user.click(okButton);

			// Verify API was called with empty S3 values (60 days)
			await waitFor(() => {
				expect(setRetentionApiV2).toHaveBeenCalledWith({
					type: 'logs',
					defaultTTLDays: 60,
					coldStorageVolume: '',
					coldStorageDurationDays: 0,
					ttlConditions: [],
				});
			});
		});
	});

	describe('Test 3: Save & Reload - Correct Display', () => {
		it('should display retention values correctly after converting from hours', () => {
			render(
				<GeneralSettings
					metricsTtlValuesPayload={mockMetricsRetention}
					tracesTtlValuesPayload={mockTracesRetention}
					logsTtlValuesPayload={mockLogsRetentionWithS3}
					getAvailableDiskPayload={mockDisksWithS3}
					metricsTtlValuesRefetch={jest.fn()}
					tracesTtlValuesRefetch={jest.fn()}
					logsTtlValuesRefetch={jest.fn()}
				/>,
			);

			const logsRow = getLogsRow();
			const inputs = logsRow.querySelectorAll('input[type="number"]');

			// Total retention: 30 days = 1 month (displays as 1 Month)
			const totalInput = inputs[0] as HTMLInputElement;
			expect(totalInput.value).toBe('1');

			// S3 retention: 24 days
			const s3Input = inputs[1] as HTMLInputElement;
			expect(s3Input.value).toBe('24');

			// Verify dropdowns: total shows Months, S3 shows Days
			const dropdowns = logsRow.querySelectorAll('.ant-select-selection-item');
			expect(dropdowns[0]).toHaveTextContent('Months');
			expect(dropdowns[1]).toHaveTextContent('Days');
		});
	});

	describe('Test 4: Save Button State with S3 Disabled', () => {
		it('should disable save button when cold_storage_ttl_days is -1 and no changes made', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(
				<GeneralSettings
					metricsTtlValuesPayload={mockMetricsRetention}
					tracesTtlValuesPayload={mockTracesRetention}
					logsTtlValuesPayload={mockLogsRetentionWithoutS3}
					getAvailableDiskPayload={mockDisksWithS3}
					metricsTtlValuesRefetch={jest.fn()}
					tracesTtlValuesRefetch={jest.fn()}
					logsTtlValuesRefetch={jest.fn()}
				/>,
			);

			const logsRow = getLogsRow();
			expect(logsRow).toBeInTheDocument();

			// Find the save button by accessible name within the Logs row
			const allSaveButtons = screen.getAllByRole('button', { name: /save/i });
			const saveButton = allSaveButtons.find((btn) =>
				logsRow.contains(btn),
			) as HTMLButtonElement;
			expect(saveButton).toBeInTheDocument();

			// Verify save button is disabled on initial load
			expect(saveButton).toBeDisabled();

			// Find the total retention input
			const inputs = logsRow.querySelectorAll('input[type="number"]');
			const totalInput = inputs[0] as HTMLInputElement;

			// Change total retention value to trigger button enable
			await user.clear(totalInput);
			await user.type(totalInput, '60');

			// Button should now be enabled after change
			await waitFor(() => {
				expect(saveButton).not.toBeDisabled();
			});

			// Revert to original value (30 days displays as 1 Month)
			await user.clear(totalInput);
			await user.type(totalInput, '1');

			// Button should be disabled again (back to original state)
			await waitFor(() => {
				expect(saveButton).toBeDisabled();
			});
		});
	});

	describe('Cloud User Rendering', () => {
		beforeEach(() => {
			(useGetTenantLicense as jest.Mock).mockReturnValue({
				isCloudUser: true,
			});
		});

		it('should render CustomDomainSettings and GeneralSettingsCloud for cloud admin', () => {
			render(
				<GeneralSettings
					metricsTtlValuesPayload={mockMetricsRetention}
					tracesTtlValuesPayload={mockTracesRetention}
					logsTtlValuesPayload={mockLogsRetentionWithS3}
					getAvailableDiskPayload={mockDisksWithS3}
					metricsTtlValuesRefetch={jest.fn()}
					tracesTtlValuesRefetch={jest.fn()}
					logsTtlValuesRefetch={jest.fn()}
				/>,
			);

			expect(screen.getByTestId('custom-domain-settings')).toBeInTheDocument();
			expect(screen.getByTestId('general-settings-cloud')).toBeInTheDocument();
		});
	});

	describe('Non-cloud user rendering', () => {
		beforeEach(() => {
			(useGetTenantLicense as jest.Mock).mockReturnValue({
				isCloudUser: false,
			});
		});

		it('should not render CustomDomainSettings or GeneralSettingsCloud', () => {
			render(
				<GeneralSettings
					metricsTtlValuesPayload={mockMetricsRetention}
					tracesTtlValuesPayload={mockTracesRetention}
					logsTtlValuesPayload={mockLogsRetentionWithS3}
					getAvailableDiskPayload={mockDisksWithS3}
					metricsTtlValuesRefetch={jest.fn()}
					tracesTtlValuesRefetch={jest.fn()}
					logsTtlValuesRefetch={jest.fn()}
				/>,
			);

			expect(
				screen.queryByTestId('custom-domain-settings'),
			).not.toBeInTheDocument();
			expect(
				screen.queryByTestId('general-settings-cloud'),
			).not.toBeInTheDocument();

			// Save buttons should be visible for non-cloud users (these are from retentions)
			const saveButtons = screen.getAllByRole('button', { name: /save/i });
			expect(saveButtons.length).toBeGreaterThan(0);
		});
	});
});
