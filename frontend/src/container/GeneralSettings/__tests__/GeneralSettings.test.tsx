import setRetentionApiV2 from 'api/settings/setRetentionV2';
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
	useGetTenantLicense: (): { isCloudUser: boolean } => ({
		isCloudUser: false,
	}),
}));

jest.mock('container/GeneralSettingsCloud', () => ({
	__esModule: true,
	default: (): null => null,
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

describe('GeneralSettings - S3 Logs Retention', () => {
	const BUTTON_SELECTOR = 'button[type="button"]';
	const PRIMARY_BUTTON_CLASS = 'ant-btn-primary';

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

			// Find the Logs card
			const logsCard = screen.getByText('Logs').closest('.ant-card');
			expect(logsCard).toBeInTheDocument();

			// Find all inputs in the Logs card - there should be 2 (total retention + S3)
			// eslint-disable-next-line sonarjs/no-duplicate-string
			const inputs = logsCard?.querySelectorAll('input[type="text"]');
			expect(inputs).toHaveLength(2);

			// The second input is the S3 retention field
			const s3Input = inputs?.[1] as HTMLInputElement;

			// Find the S3 dropdown (next sibling of the S3 input)
			const s3Dropdown = s3Input?.nextElementSibling?.querySelector(
				'.ant-select-selector',
			) as HTMLElement;
			expect(s3Dropdown).toBeInTheDocument();

			// Click the S3 dropdown to open it
			fireEvent.mouseDown(s3Dropdown);

			// Wait for dropdown options to appear and verify only "Days" is available
			await waitFor(() => {
				// eslint-disable-next-line sonarjs/no-duplicate-string
				const dropdownOptions = document.querySelectorAll('.ant-select-item');
				expect(dropdownOptions).toHaveLength(1);
				expect(dropdownOptions[0]).toHaveTextContent('Days');
			});

			// Close dropdown
			fireEvent.click(document.body);

			// Change S3 retention value to 5 days
			await user.clear(s3Input);
			await user.type(s3Input, '5');

			// Find the save button in the Logs card
			const buttons = logsCard?.querySelectorAll(BUTTON_SELECTOR);
			// The primary button should be the save button
			const saveButton = Array.from(buttons || []).find((btn) =>
				btn.className.includes(PRIMARY_BUTTON_CLASS),
			) as HTMLButtonElement;

			expect(saveButton).toBeInTheDocument();

			// Wait for button to be enabled (it should enable after value changes)
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
			const logsCard = screen.getByText('Logs').closest('.ant-card');
			const inputs = logsCard?.querySelectorAll('input[type="text"]');
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

			// Find the Logs card
			const logsCard = screen.getByText('Logs').closest('.ant-card');
			expect(logsCard).toBeInTheDocument();

			// Only 1 input should be visible (total retention, no S3)
			const inputs = logsCard?.querySelectorAll('input[type="text"]');
			expect(inputs).toHaveLength(1);

			// Change total retention value
			const totalInput = inputs?.[0] as HTMLInputElement;

			// First, change the dropdown to Days (it defaults to Months)
			const totalDropdown = totalInput?.nextElementSibling?.querySelector(
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
			const buttons = logsCard?.querySelectorAll(BUTTON_SELECTOR);
			const saveButton = Array.from(buttons || []).find((btn) =>
				btn.className.includes(PRIMARY_BUTTON_CLASS),
			) as HTMLButtonElement;

			expect(saveButton).toBeInTheDocument();

			// Wait for button to be enabled (ensures all state updates have settled)
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

			// Find the Logs card
			const logsCard = screen.getByText('Logs').closest('.ant-card');
			const inputs = logsCard?.querySelectorAll('input[type="text"]');

			// Total retention: 720 hours = 30 days = 1 month (displays as 1 Month)
			const totalInput = inputs?.[0] as HTMLInputElement;
			expect(totalInput.value).toBe('1');

			// S3 retention: 24 day
			const s3Input = inputs?.[1] as HTMLInputElement;
			expect(s3Input.value).toBe('24');

			// Verify dropdowns: total shows Months, S3 shows Days
			const dropdowns = logsCard?.querySelectorAll('.ant-select-selection-item');
			expect(dropdowns?.[0]).toHaveTextContent('Months');
			expect(dropdowns?.[1]).toHaveTextContent('Days');
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

			// Find the Logs card
			const logsCard = screen.getByText('Logs').closest('.ant-card');
			expect(logsCard).toBeInTheDocument();

			// Find the save button
			const buttons = logsCard?.querySelectorAll(BUTTON_SELECTOR);
			const saveButton = Array.from(buttons || []).find((btn) =>
				btn.className.includes(PRIMARY_BUTTON_CLASS),
			) as HTMLButtonElement;

			expect(saveButton).toBeInTheDocument();

			// Verify save button is disabled on initial load (no changes, S3 disabled with -1)
			expect(saveButton).toBeDisabled();

			// Find the total retention input
			const inputs = logsCard?.querySelectorAll('input[type="text"]');
			const totalInput = inputs?.[0] as HTMLInputElement;

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
});
