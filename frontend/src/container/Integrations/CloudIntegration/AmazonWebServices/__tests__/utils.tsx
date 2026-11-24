import { render, RenderResult, screen, within } from 'tests/test-utils';
import { IntegrationType } from 'container/Integrations/types';

import ServiceDetails from '../ServiceDetails/ServiceDetails';
import { accountsResponse, CLOUD_ACCOUNT_ID } from './mockData';

/**
 * Renders ServiceDetails (inline config form) for the account and service in the
 * URL. Tests must register MSW handlers for GET accounts and GET service details.
 */
const renderServiceDetails = (
	serviceId = 's3sync',
	type: IntegrationType = IntegrationType.AWS_SERVICES,
): RenderResult =>
	render(<ServiceDetails type={type} />, undefined, {
		initialRoute: `/?cloudAccountId=${CLOUD_ACCOUNT_ID}&service=${serviceId}`,
	});

/**
 * Asserts generic UI elements of the ServiceDetails config form (Overview tab).
 */
const assertGenericModalElements = async (): Promise<void> => {
	await expect(
		screen.findByTestId('cloud-service-logs-switch'),
	).resolves.toBeInTheDocument();
	expect(screen.getByText(/log collection/i)).toBeInTheDocument();
};

/**
 * Asserts S3 bucket selector section: title, a select per account region, and
 * the buckets already selected in each region.
 */
const assertS3SyncSpecificElements = async (
	expectedBucketsByRegion: Record<string, string[]> = {},
): Promise<void> => {
	const regions = accountsResponse.data.accounts[0]?.config?.aws?.regions || [];

	const selector = await screen.findByTestId('s3-buckets-selector');
	expect(selector).toHaveTextContent(/select s3 buckets by region/i);

	regions.forEach((region) => {
		expect(selector).toHaveTextContent(region);
		expect(screen.getByTestId(`s3-buckets-select-${region}`)).toBeInTheDocument();
	});

	Object.entries(expectedBucketsByRegion).forEach(([region, buckets]) => {
		buckets.forEach((bucket) => {
			expect(screen.getByTestId(`s3-buckets-select-${region}`)).toHaveTextContent(
				bucket,
			);
		});
	});
};

const bucketSelectInput = (region: string): HTMLElement =>
	within(screen.getByTestId(`s3-buckets-select-${region}`)).getByRole(
		'combobox',
		{ hidden: true },
	);

export {
	assertGenericModalElements,
	assertS3SyncSpecificElements,
	bucketSelectInput,
	renderServiceDetails,
};
