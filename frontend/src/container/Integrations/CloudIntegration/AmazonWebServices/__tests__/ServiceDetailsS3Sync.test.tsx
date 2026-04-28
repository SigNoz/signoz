import { fireEvent, screen, waitFor } from '@testing-library/react';
import { server } from 'mocks-server/server';
import { rest, RestRequest } from 'msw';

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

// --- RESIZE OBSERVER (required by @radix-ui in Tabs/Switch) ---
class ResizeObserverMock {
	observe(): void {}

	unobserve(): void {}

	disconnect(): void {}
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

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
describe('ServiceDetails for S3 Sync service', () => {
	jest.setTimeout(10000);
	beforeEach(() => {
		testServiceId = 's3sync';
		testInitialBuckets = {};
		server.use(
			rest.get(
				'http://localhost/api/v1/cloud_integrations/aws/accounts',
				(_req, res, ctx) => res(ctx.json(accountsResponse)),
			),
			rest.get(
				'http://localhost/api/v1/cloud_integrations/aws/services/:serviceId',
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
		renderServiceDetails({}); // No initial S3 buckets, defaults to 's3sync' serviceId
		await assertGenericModalElements();
		await assertS3SyncSpecificElements({});
	});

	it('should render with logs collection switch and bucket selectors (some buckets initially selected)', async () => {
		testInitialBuckets = initialBuckets;
		renderServiceDetails(initialBuckets);
		await assertGenericModalElements();
		await assertS3SyncSpecificElements(initialBuckets);
	});

	it('should enable save button after adding a new bucket via combobox', async () => {
		testInitialBuckets = initialBuckets;
		renderServiceDetails(initialBuckets);
		await assertGenericModalElements();
		await assertS3SyncSpecificElements(initialBuckets);

		const targetCombobox = screen.getAllByRole('combobox')[0];
		const newBucketName = 'a-newly-added-bucket';

		fireEvent.change(targetCombobox, { target: { value: newBucketName } });
		fireEvent.keyDown(targetCombobox, {
			key: 'Enter',
			code: 'Enter',
			keyCode: 13,
		});

		await waitFor(() => {
			expect(screen.getByLabelText(newBucketName)).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();
		});
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
		testInitialBuckets = initialBuckets;
		renderServiceDetails(initialBuckets);
		await assertGenericModalElements();
		await assertS3SyncSpecificElements(initialBuckets);

		const newBucketName = 'another-new-bucket';
		const targetCombobox = screen.getAllByRole('combobox')[0];

		fireEvent.change(targetCombobox, { target: { value: newBucketName } });
		fireEvent.keyDown(targetCombobox, {
			key: 'Enter',
			code: 'Enter',
			keyCode: 13,
		});

		await waitFor(() => {
			expect(screen.getByLabelText(newBucketName)).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();
		});
		fireEvent.click(screen.getByRole('button', { name: /save/i }));

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
		testServiceId = 'ec2';
		testInitialBuckets = {};
		renderServiceDetails({}, 'ec2');
		await waitFor(() => {
			expect(
				screen.queryByText(/select s3 buckets by region/i),
			).not.toBeInTheDocument();
		});
	});
});
