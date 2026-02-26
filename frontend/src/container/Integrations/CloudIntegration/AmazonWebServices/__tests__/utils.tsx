import { render, RenderResult, screen, waitFor } from '@testing-library/react';
import MockQueryClientProvider from 'providers/test/MockQueryClientProvider';

import ServiceDetails from '../ServiceDetails/ServiceDetails';
import { accountsResponse } from './mockData';

/**
 * Renders ServiceDetails (inline config form). Tests must register MSW handlers
 * for GET accounts and GET service details, and mock useUrlQuery (cloudAccountId, service).
 */
const renderServiceDetails = (
	_initialConfigLogsS3Buckets: Record<string, string[]> = {},
	_serviceId = 's3sync',
): RenderResult =>
	render(
		<MockQueryClientProvider>
			<ServiceDetails />
		</MockQueryClientProvider>,
	);

/**
 * Asserts generic UI elements of the ServiceDetails config form (Overview tab).
 */
const assertGenericModalElements = async (): Promise<void> => {
	await waitFor(() => {
		expect(screen.getByRole('switch')).toBeInTheDocument();
		expect(screen.getByText(/log collection/i)).toBeInTheDocument();
	});
};

/**
 * Asserts S3 bucket selector section and region labels/placeholders for S3 Sync.
 */
const assertS3SyncSpecificElements = async (
	expectedBucketsByRegion: Record<string, string[]> = {},
): Promise<void> => {
	const regions = accountsResponse.data.accounts[0]?.config?.regions || [];

	await waitFor(() => {
		expect(screen.getByText(/select s3 buckets by region/i)).toBeInTheDocument();

		regions.forEach((region) => {
			expect(screen.getByText(region)).toBeInTheDocument();
			const bucketsForRegion = expectedBucketsByRegion[region] || [];
			if (bucketsForRegion.length === 0) {
				expect(
					screen.getByText(`Enter S3 bucket names for ${region}`),
				).toBeInTheDocument();
			}
		});
	});
};

export {
	assertGenericModalElements,
	assertS3SyncSpecificElements,
	renderServiceDetails,
};
