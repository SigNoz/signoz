/* eslint-disable sonarjs/no-duplicate-string */
import { fireEvent, render, screen } from '@testing-library/react';
import { Temporality } from 'api/metricsExplorer/getMetricDetails';
import { MetricType } from 'api/metricsExplorer/getMetricsList';
import * as useUpdateMetricMetadataHooks from 'hooks/metricsExplorer/useUpdateMetricMetadata';
import * as useNotificationsHooks from 'hooks/useNotifications';

import Metadata from '../Metadata';

const mockUseUpdateMetricMetadata = jest.fn();
jest
	.spyOn(useUpdateMetricMetadataHooks, 'useUpdateMetricMetadata')
	.mockReturnValue({
		mutate: mockUseUpdateMetricMetadata,
		isLoading: false,
	} as any);

const mockErrorNotification = jest.fn();
const mockSuccessNotification = jest.fn();
jest.spyOn(useNotificationsHooks, 'useNotifications').mockReturnValue({
	notifications: {
		error: mockErrorNotification,
		success: mockSuccessNotification,
	},
} as any);

const mockMetricName = 'test_metric';
const mockMetricMetadata = {
	metric_type: MetricType.GAUGE,
	description: 'test_description',
	unit: 'test_unit',
	temporality: Temporality.DELTA,
};
const mockRefetchMetricDetails = jest.fn();

describe('Metadata', () => {
	it('should render the metadata properly', () => {
		render(
			<Metadata
				metricName={mockMetricName}
				metadata={mockMetricMetadata}
				refetchMetricDetails={mockRefetchMetricDetails}
			/>,
		);

		expect(screen.getByText('Metric Type')).toBeInTheDocument();
		expect(screen.getByText(mockMetricMetadata.metric_type)).toBeInTheDocument();
		expect(screen.getByText('Description')).toBeInTheDocument();
		expect(screen.getByText(mockMetricMetadata.description)).toBeInTheDocument();
		expect(screen.getByText('Unit')).toBeInTheDocument();
		expect(screen.getByText(mockMetricMetadata.unit)).toBeInTheDocument();
		expect(screen.getByText('Temporality')).toBeInTheDocument();
		expect(screen.getByText(mockMetricMetadata.temporality)).toBeInTheDocument();
	});

	it('editing the metadata should show the form inputs', () => {
		render(
			<Metadata
				metricName={mockMetricName}
				metadata={mockMetricMetadata}
				refetchMetricDetails={mockRefetchMetricDetails}
			/>,
		);

		const editButton = screen.getByText('Edit');
		expect(editButton).toBeInTheDocument();
		fireEvent.click(editButton);

		expect(screen.getByTestId('metric-type-select')).toBeInTheDocument();
		expect(screen.getByTestId('temporality-select')).toBeInTheDocument();
		expect(screen.getByTestId('description-input')).toBeInTheDocument();
	});

	it('should update the metadata when the form is submitted', async () => {
		render(
			<Metadata
				metricName={mockMetricName}
				metadata={mockMetricMetadata}
				refetchMetricDetails={mockRefetchMetricDetails}
			/>,
		);

		const editButton = screen.getByText('Edit');
		expect(editButton).toBeInTheDocument();
		fireEvent.click(editButton);

		const metricDescriptionInput = screen.getByTestId('description-input');
		expect(metricDescriptionInput).toBeInTheDocument();
		fireEvent.change(metricDescriptionInput, {
			target: { value: 'Updated description' },
		});

		const saveButton = screen.getByText('Save');
		expect(saveButton).toBeInTheDocument();
		fireEvent.click(saveButton);

		expect(mockUseUpdateMetricMetadata).toHaveBeenCalledWith(
			expect.objectContaining({
				metricName: mockMetricName,
				payload: expect.objectContaining({
					description: 'Updated description',
				}),
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
				metricName={mockMetricName}
				metadata={mockMetricMetadata}
				refetchMetricDetails={mockRefetchMetricDetails}
			/>,
		);

		const editButton = screen.getByText('Edit');
		fireEvent.click(editButton);

		const metricDescriptionInput = screen.getByTestId('description-input');
		fireEvent.change(metricDescriptionInput, {
			target: { value: 'Updated description' },
		});

		const saveButton = screen.getByText('Save');
		fireEvent.click(saveButton);

		const onSuccessCallback =
			mockUseUpdateMetricMetadata.mock.calls[0][1].onSuccess;
		onSuccessCallback({ statusCode: 200 });

		expect(mockSuccessNotification).toHaveBeenCalledWith({
			message: 'Metadata updated successfully',
		});
		expect(mockRefetchMetricDetails).toHaveBeenCalled();
	});

	it('should show error notification when metadata update fails with non-200 response', async () => {
		render(
			<Metadata
				metricName={mockMetricName}
				metadata={mockMetricMetadata}
				refetchMetricDetails={mockRefetchMetricDetails}
			/>,
		);

		const editButton = screen.getByText('Edit');
		fireEvent.click(editButton);

		const metricDescriptionInput = screen.getByTestId('description-input');
		fireEvent.change(metricDescriptionInput, {
			target: { value: 'Updated description' },
		});

		const saveButton = screen.getByText('Save');
		fireEvent.click(saveButton);

		const onSuccessCallback =
			mockUseUpdateMetricMetadata.mock.calls[0][1].onSuccess;
		onSuccessCallback({ statusCode: 500 });

		expect(mockErrorNotification).toHaveBeenCalledWith({
			message:
				'Failed to update metadata, please try again. If the issue persists, please contact support.',
		});
	});

	it('should show error notification when metadata update fails', async () => {
		render(
			<Metadata
				metricName={mockMetricName}
				metadata={mockMetricMetadata}
				refetchMetricDetails={mockRefetchMetricDetails}
			/>,
		);

		const editButton = screen.getByText('Edit');
		fireEvent.click(editButton);

		const metricDescriptionInput = screen.getByTestId('description-input');
		fireEvent.change(metricDescriptionInput, {
			target: { value: 'Updated description' },
		});

		const saveButton = screen.getByText('Save');
		fireEvent.click(saveButton);

		const onErrorCallback = mockUseUpdateMetricMetadata.mock.calls[0][1].onError;

		const error = new Error('Failed to update metadata');
		onErrorCallback(error);

		expect(mockErrorNotification).toHaveBeenCalledWith({
			message:
				'Failed to update metadata, please try again. If the issue persists, please contact support.',
		});
	});

	it('cancel button should cancel the edit mode', () => {
		render(
			<Metadata
				metricName={mockMetricName}
				metadata={mockMetricMetadata}
				refetchMetricDetails={mockRefetchMetricDetails}
			/>,
		);

		const editButton = screen.getByText('Edit');
		expect(editButton).toBeInTheDocument();
		fireEvent.click(editButton);

		const cancelButton = screen.getByText('Cancel');
		expect(cancelButton).toBeInTheDocument();
		fireEvent.click(cancelButton);

		const editButton2 = screen.getByText('Edit');
		expect(editButton2).toBeInTheDocument();
	});
});
