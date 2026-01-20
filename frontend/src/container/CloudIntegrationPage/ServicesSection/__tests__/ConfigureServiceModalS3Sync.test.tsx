import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { server } from 'mocks-server/server';
import { rest, RestRequest } from 'msw'; // Import RestRequest for req.json() typing

import { UpdateServiceConfigPayload } from '../types';
import { accountsResponse, CLOUD_ACCOUNT_ID, initialBuckets } from './mockData';
import {
	assertGenericModalElements,
	assertS3SyncSpecificElements,
	renderModal,
} from './utils';

// --- MOCKS ---
jest.mock('hooks/useUrlQuery', () => ({
	__esModule: true,
	default: jest.fn(() => ({
		get: jest.fn((paramName: string) => {
			if (paramName === 'cloudAccountId') {
				return CLOUD_ACCOUNT_ID;
			}
			return null;
		}),
	})),
}));

// --- TEST SUITE ---
describe('ConfigureServiceModal for S3 Sync service', () => {
	jest.setTimeout(10000);
	beforeEach(() => {
		server.use(
			rest.get(
				'http://localhost/api/v1/cloud-integrations/aws/accounts',
				(req, res, ctx) => res(ctx.json(accountsResponse)),
			),
		);
	});

	it('should render with logs collection switch and bucket selectors (no buckets initially selected)', async () => {
		act(() => {
			renderModal({}); // No initial S3 buckets, defaults to 's3sync' serviceId
		});
		await assertGenericModalElements(); // Use new generic assertion
		await assertS3SyncSpecificElements({}); // Use new S3-specific assertion
	});

	it('should render with logs collection switch and bucket selectors (some buckets initially selected)', async () => {
		act(() => {
			renderModal(initialBuckets); // Defaults to 's3sync' serviceId
		});
		await assertGenericModalElements(); // Use new generic assertion
		await assertS3SyncSpecificElements(initialBuckets); // Use new S3-specific assertion
	});

	it('should enable save button after adding a new bucket via combobox', async () => {
		act(() => {
			renderModal(initialBuckets); // Defaults to 's3sync' serviceId
		});
		await assertGenericModalElements();
		await assertS3SyncSpecificElements(initialBuckets);

		expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();

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
		act(() => {
			renderModal(initialBuckets); // Defaults to 's3sync' serviceId
		});
		await assertGenericModalElements();
		await assertS3SyncSpecificElements(initialBuckets);

		expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();

		const newBucketName = 'another-new-bucket';
		// As before, targeting the first combobox, assumed to be for 'ap-south-1'.
		const targetCombobox = screen.getAllByRole('combobox')[0];

		// eslint-disable-next-line sonarjs/no-identical-functions
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
						'us-east-2': ['first-bucket', 'second-bucket'], // Existing buckets
						'ap-south-1': [newBucketName], // Newly added bucket for the first region
					},
				},
				metrics: {},
			},
		});
	});

	it('should not render S3 bucket region selector UI for services other than s3sync', async () => {
		const otherServiceId = 'cloudwatch';
		act(() => {
			renderModal({}, otherServiceId);
		});
		await assertGenericModalElements();

		await waitFor(() => {
			expect(
				screen.queryByRole('heading', { name: /select s3 buckets by region/i }),
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
