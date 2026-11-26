import { server } from 'mocks-server/server';
import { rest, RestRequest } from 'msw';
import { screen, userEvent, waitFor, within } from 'tests/test-utils';

import {
	accountsResponse,
	buildServiceDetailsResponse,
	CLOUD_ACCOUNT_ID,
	initialBuckets,
} from './mockData';
import {
	assertGenericModalElements,
	assertS3SyncSpecificElements,
	bucketSelectInput,
	renderServiceDetails,
} from './utils';

// --- MOCKS ---
jest.mock('components/MarkdownRenderer/MarkdownRenderer', () => ({
	MarkdownRenderer: (): JSX.Element => <div data-testid="markdown-renderer" />,
}));
jest.mock(
	'container/Integrations/CloudIntegration/ServiceDashboards/ServiceDashboards',
	() => ({
		__esModule: true,
		default: (): JSX.Element => <div data-testid="service-dashboards" />,
	}),
);

let testInitialBuckets: Record<string, string[]> = {};

const addBucket = async (
	user: ReturnType<typeof userEvent.setup>,
	bucketName: string,
): Promise<void> => {
	await screen.findByTestId('s3-buckets-select-ap-south-1');
	await user.click(bucketSelectInput('ap-south-1'));
	// antd reads the legacy keyCode on Enter, which user-event leaves at 0, so
	// commit the tag with the select's comma separator instead.
	await user.paste(`${bucketName},`);
};

// --- TEST SUITE ---
describe('ServiceDetails for S3 Sync service', () => {
	beforeEach(() => {
		testInitialBuckets = {};
		server.use(
			rest.get(
				'http://localhost/api/v1/cloud_integrations/aws/accounts',
				(_req, res, ctx) => res(ctx.json(accountsResponse)),
			),
			rest.get(
				'http://localhost/api/v1/cloud_integrations/aws/accounts/:accountId/services/:serviceId',
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
		renderServiceDetails();
		await assertGenericModalElements();
		await assertS3SyncSpecificElements({});
	});

	it('should render with logs collection switch and bucket selectors (some buckets initially selected)', async () => {
		testInitialBuckets = initialBuckets;
		renderServiceDetails();
		await assertGenericModalElements();
		await assertS3SyncSpecificElements(initialBuckets);
	});

	it('should enable save button after adding a new bucket via combobox', async () => {
		const user = userEvent.setup();
		testInitialBuckets = initialBuckets;
		renderServiceDetails();

		const newBucketName = 'a-newly-added-bucket';
		await addBucket(user, newBucketName);

		expect(
			within(screen.getByTestId('s3-buckets-select-ap-south-1')).getByTitle(
				newBucketName,
			),
		).toHaveTextContent(newBucketName);
		await expect(
			screen.findByTestId('cloud-service-save-btn'),
		).resolves.not.toHaveAttribute('aria-disabled', 'true');
	});

	it('should send updated bucket configuration on save', async () => {
		let capturedPayload: Record<string, unknown> | null = null;
		const mockUpdateConfigUrl = `http://localhost/api/v1/cloud_integrations/aws/accounts/${CLOUD_ACCOUNT_ID}/services/s3sync`;

		// Override PUT handler specifically for this test to capture payload
		server.use(
			rest.put(mockUpdateConfigUrl, async (req: RestRequest, res, ctx) => {
				capturedPayload = await req.json();
				return res(ctx.status(200), ctx.json({ message: 'Config updated' }));
			}),
		);
		const user = userEvent.setup();
		testInitialBuckets = initialBuckets;
		renderServiceDetails();

		const newBucketName = 'another-new-bucket';
		await addBucket(user, newBucketName);
		await user.click(await screen.findByTestId('cloud-service-save-btn'));

		await waitFor(() => {
			expect(capturedPayload).not.toBeNull();
		});

		expect(capturedPayload).toStrictEqual({
			config: {
				aws: {
					logs: {
						enabled: true,
						s3Buckets: {
							'us-east-2': ['first-bucket', 'second-bucket'],
							'ap-south-1': [newBucketName],
						},
					},
					metrics: { enabled: false },
				},
			},
		});
	});

	it('should not render S3 bucket region selector UI for services other than s3sync', async () => {
		renderServiceDetails('ec2');
		await screen.findByTestId('markdown-renderer');
		expect(screen.queryByTestId('s3-buckets-selector')).not.toBeInTheDocument();
	});
});
