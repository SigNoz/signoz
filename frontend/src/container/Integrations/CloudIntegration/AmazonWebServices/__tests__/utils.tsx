import { screen, waitFor } from '@testing-library/react';

import { accountsResponse } from './mockData';

/**
 * Asserts that generic UI elements of the modal are present.
 */
const assertGenericModalElements = async (): Promise<void> => {
	await waitFor(() => {
		expect(screen.getByRole('switch')).toBeInTheDocument();
		expect(screen.getByText(/log collection/i)).toBeInTheDocument();
		expect(
			screen.getByText(
				/to ingest logs from your aws services, you must complete several steps/i,
			),
		).toBeInTheDocument();
	});
};

/**
 * Asserts the state of S3 bucket selectors for each region, specific to S3 Sync.
 */
const assertS3SyncSpecificElements = async (
	expectedBucketsByRegion: Record<string, string[]> = {},
): Promise<void> => {
	const regions = accountsResponse.data.accounts[0]?.config?.regions || [];

	await waitFor(() => {
		expect(
			screen.getByRole('heading', { name: /select s3 buckets by region/i }),
		).toBeInTheDocument();

		regions.forEach((region) => {
			expect(screen.getByText(region)).toBeInTheDocument();
			const bucketsForRegion = expectedBucketsByRegion[region] || [];
			if (bucketsForRegion.length > 0) {
				bucketsForRegion.forEach((bucket) => {
					expect(screen.getByText(bucket)).toBeInTheDocument();
				});
			} else {
				expect(
					screen.getByText(`Enter S3 bucket names for ${region}`),
				).toBeInTheDocument();
			}
		});
	});
};

export { assertGenericModalElements, assertS3SyncSpecificElements };
