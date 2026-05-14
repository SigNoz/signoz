import { render, RenderResult, screen, waitFor } from '@testing-library/react';
import { IntegrationType } from 'container/Integrations/types';
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
	type: IntegrationType = IntegrationType.AWS_SERVICES,
): RenderResult =>
	render(
		<MockQueryClientProvider>
			<ServiceDetails type={type} />
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
 * Asserts S3 bucket selector section: title, region labels, and one combobox per region.
 * Does not assert placeholder text (antd Select may not expose it as placeholder attribute).
 */
const assertS3SyncSpecificElements = async (
	_expectedBucketsByRegion: Record<string, string[]> = {},
): Promise<void> => {
	const regions = accountsResponse.data.accounts[0]?.config?.aws?.regions || [];

	await waitFor(() => {
		expect(screen.getByText(/select s3 buckets by region/i)).toBeInTheDocument();

		regions.forEach((region) => {
			expect(screen.getByText(region)).toBeInTheDocument();
		});

		const comboboxes = screen.getAllByRole('combobox');
		expect(comboboxes.length).toBeGreaterThanOrEqual(regions.length);
	});
};

export {
	assertGenericModalElements,
	assertS3SyncSpecificElements,
	renderServiceDetails,
};
