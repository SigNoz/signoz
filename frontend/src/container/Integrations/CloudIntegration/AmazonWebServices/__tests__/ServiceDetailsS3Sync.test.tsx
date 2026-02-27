import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { server } from 'mocks-server/server';
import { rest, RestRequest } from 'msw';

import { UpdateServiceConfigPayload } from '../types';
import {
	accountsResponse,
	buildServiceDetailsResponse,
	CLOUD_ACCOUNT_ID,
	initialBuckets,
} from './mockData';
import {
	assertGenericModalElements,
	assertS3SyncSpecificElements,
	renderServiceDetails,
} from './utils';

// --- MOCKS ---
jest.mock('components/MarkdownRenderer/MarkdownRenderer', () => ({
	MarkdownRenderer: (): JSX.Element => <div data-testid="markdown-renderer" />,
}));
jest.mock(
	'container/Integrations/CloudIntegration/AmazonWebServices/ServiceDashboards/ServiceDashboards',
	() => ({
		__esModule: true,
		default: (): JSX.Element => <div data-testid="service-dashboards" />,
	}),
);

let testServiceId = 's3sync';
let testInitialBuckets: Record<string, string[]> = {};
const mockGet = jest.fn((param: string) => {
	if (param === 'cloudAccountId') {
		return CLOUD_ACCOUNT_ID;
	}
	if (param === 'service') {
		return testServiceId;
	}
	return null;
});
jest.mock('hooks/useUrlQuery', () => ({
	__esModule: true,
	default: (): { get: (param: string) => string | null } => ({ get: mockGet }),
}));

// --- TEST SUITE ---
describe('ConfigureServiceModal for S3 Sync service', () => {
	jest.setTimeout(10000);
	beforeEach(() => {
		testServiceId = 's3sync';
		testInitialBuckets = {};
		server.use(
			rest.get(
				'http://localhost/api/v1/cloud-integrations/aws/accounts',
				(_req, res, ctx) => res(ctx.json(accountsResponse)),
			),
			rest.get(
				'http://localhost/api/v1/cloud-integrations/aws/services/:serviceId',
				(req, res, ctx) =>
					res(
						ctx.json(
							buildServiceDetailsResponse(
								req.params.serviceId as string,
								testInitialBuckets,
							),
						),
					),
			),
		);
	});

	it('should render with logs collection switch and bucket selectors (no buckets initially selected)', async () => {
		act(() => {
			renderServiceDetails({}); // No initial S3 buckets, defaults to 's3sync' serviceId
		});
		await assertGenericModalElements(); // Use new generic assertion
		await assertS3SyncSpecificElements({}); // Use new S3-specific assertion
	});

	it('should render with logs collection switch and bucket selectors (some buckets initially selected)', async () => {
		testInitialBuckets = initialBuckets;
		act(() => {
			renderServiceDetails(initialBuckets);
		});
		await assertGenericModalElements();
		await assertS3SyncSpecificElements(initialBuckets);
	});

	it('should enable save button after adding a new bucket via combobox', async () => {
		testInitialBuckets = initialBuckets;
		act(() => {
			renderServiceDetails(initialBuckets);
		});
		await assertGenericModalElements();
		await assertS3SyncSpecificElements(initialBuckets);

		const targetCombobox = screen.getAllByRole('combobox')[0];
		const newBucketName = 'a-newly-added-bucket';

		act(() => {
			fireEvent.change(targetCombobox, { target: { value: newBucketName } });
			fireEvent.keyDown(targetCombobox, {
				key: 'Enter',
				code: 'Enter',
				keyCode: 13,
			});
		});

		await waitFor(() => {
			expect(screen.getByLabelText(newBucketName)).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();
		});
	});

	it('should send updated bucket configuration on save', async () => {
		let capturedPayload: UpdateServiceConfigPayload | null = null;
		const mockUpdateConfigUrl =
			'http://localhost/api/v1/cloud-integrations/aws/services/s3sync/config';

		// Override POST handler specifically for this test to capture payload
		server.use(
			rest.post(mockUpdateConfigUrl, async (req: RestRequest, res, ctx) => {
				capturedPayload = await req.json();
				return res(ctx.status(200), ctx.json({ message: 'Config updated' }));
			}),
		);
		testInitialBuckets = initialBuckets;
		act(() => {
			renderServiceDetails(initialBuckets);
		});
		await assertGenericModalElements();
		await assertS3SyncSpecificElements(initialBuckets);

		const newBucketName = 'another-new-bucket';
		// As before, targeting the first combobox, assumed to be for 'ap-south-1'.
		const targetCombobox = screen.getAllByRole('combobox')[0];

		act(() => {
			fireEvent.change(targetCombobox, { target: { value: newBucketName } });
			fireEvent.keyDown(targetCombobox, {
				key: 'Enter',
				code: 'Enter',
				keyCode: 13,
			});
		});

		await waitFor(() => {
			expect(screen.getByLabelText(newBucketName)).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();
			act(() => {
				fireEvent.click(screen.getByRole('button', { name: /save/i }));
			});
		});

		await waitFor(() => {
			expect(capturedPayload).not.toBeNull();
		});

		expect(capturedPayload).toEqual({
			cloud_account_id: CLOUD_ACCOUNT_ID,
			config: {
				logs: {
					enabled: true,
					s3_buckets: {
						'us-east-2': ['first-bucket', 'second-bucket'],
						'ap-south-1': [newBucketName],
					},
				},
				metrics: { enabled: false },
			},
		});
	});

	it('should not render S3 bucket region selector UI for services other than s3sync', async () => {
		testServiceId = 'cloudwatch';
		testInitialBuckets = {};
		act(() => {
			renderServiceDetails({}, 'cloudwatch');
		});
		// cloudwatch has no logs UI, so no switch; only assert S3 section is absent
		await waitFor(() => {
			expect(
				screen.queryByText(/select s3 buckets by region/i),
			).not.toBeInTheDocument();
			const regions = accountsResponse.data.accounts[0]?.config?.regions || [];
			regions.forEach((region) => {
				expect(
					screen.queryByText(`Enter S3 bucket names for ${region}`),
				).not.toBeInTheDocument();
			});
		});
	});
});
