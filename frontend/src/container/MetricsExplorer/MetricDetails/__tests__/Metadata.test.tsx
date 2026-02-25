/* eslint-disable sonarjs/no-duplicate-string */
import { render, screen } from '@testing-library/react';
import * as metricsExplorerHooks from 'api/generated/services/metrics';
import {
	GetMetricMetadata200,
	MetrictypesTemporalityDTO,
	MetrictypesTypeDTO,
} from 'api/generated/services/sigNoz.schemas';
import { Temporality } from 'api/metricsExplorer/getMetricDetails';
import {
	UniversalYAxisUnit,
	YAxisUnitSelectorProps,
} from 'components/YAxisUnitSelector/types';
import * as useNotificationsHooks from 'hooks/useNotifications';
import { userEvent } from 'tests/test-utils';
import { SelectOption } from 'types/common/select';

import Metadata from '../Metadata';
import { MetricMetadata } from '../types';
import { transformMetricMetadata } from '../utils';
import { getMockMetricMetadataData, MOCK_METRIC_NAME } from './testUtlls';

// Mock antd select for testing
jest.mock('antd', () => ({
	...jest.requireActual('antd'),
	Select: ({
		children,
		onChange,
		value,
		'data-testid': dataTestId,
		options,
	}: {
		children: React.ReactNode;
		onChange: (value: string) => void;
		value: string;
		'data-testid': string;
		options: SelectOption<string, string>[];
	}): JSX.Element => (
		<select
			data-testid={dataTestId}
			value={value}
			onChange={(e): void => onChange?.(e.target.value)}
		>
			{options?.map((option: SelectOption<string, string>) => (
				<option key={option.value} value={option.value}>
					{option.label}
				</option>
			))}
			{children}
		</select>
	),
}));
jest.mock(
	'components/YAxisUnitSelector',
	() =>
		function MockYAxisUnitSelector({
			onChange,
			value,
			'data-testid': dataTestId,
		}: YAxisUnitSelectorProps): JSX.Element {
			return (
				<select
					data-testid={dataTestId}
					value={value}
					onChange={(e): void => onChange?.(e.target.value as UniversalYAxisUnit)}
				>
					<option value="">Please select a unit</option>
					<option value="By">Bytes (B)</option>
					<option value="s">Seconds (s)</option>
					<option value="ms">Milliseconds (ms)</option>
				</select>
			);
		},
);

jest.mock('react-query', () => ({
	...jest.requireActual('react-query'),
	useQueryClient: (): { invalidateQueries: () => void } => ({
		invalidateQueries: jest.fn(),
	}),
}));

const mockUseUpdateMetricMetadataHook = jest.spyOn(
	metricsExplorerHooks,
	'useUpdateMetricMetadata',
);
type UseUpdateMetricMetadataResult = ReturnType<
	typeof metricsExplorerHooks.useUpdateMetricMetadata
>;
const mockUseUpdateMetricMetadata = jest.fn();

const mockMetricMetadata = transformMetricMetadata(
	getMockMetricMetadataData().data as GetMetricMetadata200,
) as MetricMetadata;

const mockErrorNotification = jest.fn();
const mockSuccessNotification = jest.fn();
jest.spyOn(useNotificationsHooks, 'useNotifications').mockReturnValue({
	notifications: {
		error: mockErrorNotification,
		success: mockSuccessNotification,
	},
} as any);

const mockRefetchMetricMetadata = jest.fn();

describe('Metadata', () => {
	beforeEach(() => {
		mockUseUpdateMetricMetadataHook.mockReturnValue(({
			mutate: mockUseUpdateMetricMetadata,
		} as Partial<UseUpdateMetricMetadataResult>) as UseUpdateMetricMetadataResult);
	});

	it('should render the metadata properly', () => {
		render(
			<Metadata
				metricName={MOCK_METRIC_NAME}
				metadata={mockMetricMetadata}
				isErrorMetricMetadata={false}
				isLoadingMetricMetadata={false}
				refetchMetricMetadata={mockRefetchMetricMetadata}
			/>,
		);

		expect(screen.getByText('Metric Type')).toBeInTheDocument();
		expect(screen.getByText('Gauge')).toBeInTheDocument();
		expect(screen.getByText('Description')).toBeInTheDocument();
		expect(screen.getByText(mockMetricMetadata.description)).toBeInTheDocument();
		expect(screen.getByText('Unit')).toBeInTheDocument();
		expect(screen.getByText(mockMetricMetadata.unit)).toBeInTheDocument();
		expect(screen.getByText('Temporality')).toBeInTheDocument();
		expect(screen.getByText('Delta')).toBeInTheDocument();
	});

	it('editing the metadata should show the form inputs', async () => {
		render(
			<Metadata
				metricName={MOCK_METRIC_NAME}
				metadata={mockMetricMetadata}
				isErrorMetricMetadata={false}
				isLoadingMetricMetadata={false}
				refetchMetricMetadata={mockRefetchMetricMetadata}
			/>,
		);

		const editButton = screen.getByText('Edit');
		expect(editButton).toBeInTheDocument();
		await userEvent.click(editButton);

		expect(screen.getByTestId('metric-type-select')).toBeInTheDocument();
		expect(screen.getByTestId('temporality-select')).toBeInTheDocument();
		expect(screen.getByTestId('description-input')).toBeInTheDocument();
	});

	it('should update the metadata when the form is submitted', async () => {
		render(
			<Metadata
				metricName={MOCK_METRIC_NAME}
				metadata={{
					...mockMetricMetadata,
					unit: '',
				}}
				isErrorMetricMetadata={false}
				isLoadingMetricMetadata={false}
				refetchMetricMetadata={mockRefetchMetricMetadata}
			/>,
		);

		const editButton = screen.getByText('Edit');
		expect(editButton).toBeInTheDocument();
		await userEvent.click(editButton);

		const metricDescriptionInput = screen.getByTestId('description-input');
		expect(metricDescriptionInput).toBeInTheDocument();
		await userEvent.clear(metricDescriptionInput);
		await userEvent.type(metricDescriptionInput, 'Updated description');

		const metricTypeSelect = screen.getByTestId('metric-type-select');
		expect(metricTypeSelect).toBeInTheDocument();
		await userEvent.selectOptions(metricTypeSelect, MetrictypesTypeDTO.sum);

		const temporalitySelect = screen.getByTestId('temporality-select');
		expect(temporalitySelect).toBeInTheDocument();
		await userEvent.selectOptions(temporalitySelect, Temporality.CUMULATIVE);

		const unitSelect = screen.getByTestId('unit-select');
		expect(unitSelect).toBeInTheDocument();
		await userEvent.selectOptions(unitSelect, 'By');

		const saveButton = screen.getByText('Save');
		expect(saveButton).toBeInTheDocument();
		await userEvent.click(saveButton);

		expect(mockUseUpdateMetricMetadata).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					type: MetrictypesTypeDTO.sum,
					temporality: MetrictypesTemporalityDTO.cumulative,
					unit: 'By',
					isMonotonic: true,
				}),
				pathParams: {
					metricName: MOCK_METRIC_NAME,
				},
			}),
			expect.objectContaining({
				onSuccess: expect.any(Function),
				onError: expect.any(Function),
			}),
		);
	});

	it('should show success notification when metadata is updated successfully', async () => {
		render(
			<Metadata
				metricName={MOCK_METRIC_NAME}
				metadata={mockMetricMetadata}
				isErrorMetricMetadata={false}
				isLoadingMetricMetadata={false}
				refetchMetricMetadata={mockRefetchMetricMetadata}
			/>,
		);

		const editButton = screen.getByText('Edit');
		await userEvent.click(editButton);

		const metricDescriptionInput = screen.getByTestId('description-input');
		await userEvent.clear(metricDescriptionInput);
		await userEvent.type(metricDescriptionInput, 'Updated description');

		const saveButton = screen.getByText('Save');
		await userEvent.click(saveButton);

		const onSuccessCallback =
			mockUseUpdateMetricMetadata.mock.calls[0][1].onSuccess;
		onSuccessCallback({ status: 200 });

		expect(mockSuccessNotification).toHaveBeenCalledWith({
			message: 'Metadata updated successfully',
		});
	});

	it('should show error notification when metadata update fails with non-200 response', async () => {
		render(
			<Metadata
				metricName={MOCK_METRIC_NAME}
				metadata={mockMetricMetadata}
				isErrorMetricMetadata={false}
				isLoadingMetricMetadata={false}
				refetchMetricMetadata={mockRefetchMetricMetadata}
			/>,
		);

		const editButton = screen.getByText('Edit');
		await userEvent.click(editButton);

		const metricDescriptionInput = screen.getByTestId('description-input');
		await userEvent.clear(metricDescriptionInput);
		await userEvent.type(metricDescriptionInput, 'Updated description');

		const saveButton = screen.getByText('Save');
		await userEvent.click(saveButton);

		const onErrorCallback = mockUseUpdateMetricMetadata.mock.calls[0][1].onError;
		onErrorCallback({ status: 500 });

		expect(mockErrorNotification).toHaveBeenCalledWith({
			message:
				'Failed to update metadata, please try again. If the issue persists, please contact support.',
		});
	});

	it('should show error notification when metadata update fails', async () => {
		render(
			<Metadata
				metricName={MOCK_METRIC_NAME}
				metadata={mockMetricMetadata}
				isErrorMetricMetadata={false}
				isLoadingMetricMetadata={false}
				refetchMetricMetadata={mockRefetchMetricMetadata}
			/>,
		);

		const editButton = screen.getByText('Edit');
		await userEvent.click(editButton);

		const metricDescriptionInput = screen.getByTestId('description-input');
		await userEvent.clear(metricDescriptionInput);
		await userEvent.type(metricDescriptionInput, 'Updated description');

		const saveButton = screen.getByText('Save');
		await userEvent.click(saveButton);

		const onErrorCallback = mockUseUpdateMetricMetadata.mock.calls[0][1].onError;

		const error = new Error('Failed to update metadata');
		onErrorCallback(error);

		expect(mockErrorNotification).toHaveBeenCalledWith({
			message:
				'Failed to update metadata, please try again. If the issue persists, please contact support.',
		});
	});

	it('cancel button should cancel the edit mode', async () => {
		render(
			<Metadata
				metricName={MOCK_METRIC_NAME}
				metadata={mockMetricMetadata}
				isErrorMetricMetadata={false}
				isLoadingMetricMetadata={false}
				refetchMetricMetadata={mockRefetchMetricMetadata}
			/>,
		);

		const editButton = screen.getByText('Edit');
		expect(editButton).toBeInTheDocument();
		await userEvent.click(editButton);

		const cancelButton = screen.getByText('Cancel');
		expect(cancelButton).toBeInTheDocument();
		await userEvent.click(cancelButton);

		const editButton2 = screen.getByText('Edit');
		expect(editButton2).toBeInTheDocument();
	});

	it('should not allow editing of unit if it is already set', async () => {
		render(
			<Metadata
				metricName={MOCK_METRIC_NAME}
				metadata={mockMetricMetadata}
				isErrorMetricMetadata={false}
				isLoadingMetricMetadata={false}
				refetchMetricMetadata={mockRefetchMetricMetadata}
			/>,
		);

		const editButton = screen.getByText('Edit');
		expect(editButton).toBeInTheDocument();
		await userEvent.click(editButton);

		const unitSelect = screen.queryByTestId('unit-select');
		expect(unitSelect).not.toBeInTheDocument();
	});
});
