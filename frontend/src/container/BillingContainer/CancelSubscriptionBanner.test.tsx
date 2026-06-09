import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import CancelSubscriptionBanner from './CancelSubscriptionBanner';

jest.mock('utils/basePath', () => ({
	getBasePath: (): string => '/',
	withBasePath: (path: string): string => path,
	getAbsoluteUrl: (path: string): string => `https://test.signoz.io${path}`,
	getBaseUrl: (): string => 'https://test.signoz.io',
}));

function mockMailto(): {
	mockClick: jest.Mock;
	appendSpy: jest.SpyInstance;
	removeSpy: jest.SpyInstance;
} {
	const mockClick = jest.fn();
	const realCreateElement = document.createElement.bind(document);

	// Create a real anchor so JSDOM's appendChild/removeChild accept it.
	// Override its click() so no navigation occurs.
	jest
		.spyOn(document, 'createElement')
		.mockImplementation((tag: string, options?: ElementCreationOptions) => {
			if (tag === 'a') {
				const anchor = realCreateElement('a') as HTMLAnchorElement;
				anchor.click = mockClick;
				return anchor;
			}
			return realCreateElement(tag, options);
		});

	const appendSpy = jest.spyOn(document.body, 'appendChild');
	const removeSpy = jest.spyOn(document.body, 'removeChild');
	return { mockClick, appendSpy, removeSpy };
}

describe('CancelSubscriptionBanner', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('renders banner with title and subtitle', () => {
		render(<CancelSubscriptionBanner />);
		expect(
			screen.getByText('Cancel your subscription', { selector: 'span' }),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				/When you cancel your SigNoz subscription, all your data will be deleted/i,
			),
		).toBeInTheDocument();
	});

	it('opens dialog with content when Cancel Subscription is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<CancelSubscriptionBanner />);

		await user.click(
			screen.getByRole('button', { name: /cancel subscription/i }),
		);

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(
			screen.getByText(/Cancelling your subscription would stop your data/i),
		).toBeInTheDocument();
		expect(screen.getByText(/Type/i)).toBeInTheDocument();
		expect(screen.getByTestId('cancel-confirm-input')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
		expect(
			screen.getByTestId('cancel-subscription-confirm-btn'),
		).toBeInTheDocument();
	});

	it('keeps Cancel subscription button disabled until "cancel" is typed', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<CancelSubscriptionBanner />);

		await user.click(
			screen.getByRole('button', { name: /cancel subscription/i }),
		);

		const confirmButton = screen.getByTestId('cancel-subscription-confirm-btn');
		expect(confirmButton).toBeDisabled();

		const input = screen.getByTestId('cancel-confirm-input');
		await user.type(input, 'canc');
		expect(confirmButton).toBeDisabled();

		await user.type(input, 'el');
		expect(confirmButton).toBeEnabled();
	});

	it('closes dialog and resets input when Go back is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<CancelSubscriptionBanner />);

		await user.click(
			screen.getByRole('button', { name: /cancel subscription/i }),
		);

		const input = screen.getByTestId('cancel-confirm-input');
		await user.type(input, 'cancel');

		await user.click(screen.getByRole('button', { name: /go back/i }));
		await waitFor(() =>
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
		);

		await user.click(
			screen.getByRole('button', { name: /cancel subscription/i }),
		);
		expect(screen.getByTestId('cancel-confirm-input')).toHaveValue('');
	});

	it('fires mailto via DOM-attached anchor and shows fallback view after confirming', async () => {
		const { mockClick, appendSpy, removeSpy } = mockMailto();

		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<CancelSubscriptionBanner />);

		await user.click(
			screen.getByRole('button', { name: /cancel subscription/i }),
		);
		await user.type(screen.getByTestId('cancel-confirm-input'), 'cancel');
		await user.click(screen.getByTestId('cancel-subscription-confirm-btn'));

		const appendedAnchor = appendSpy.mock.calls
			.map(([node]) => node)
			.find(
				(node): node is HTMLAnchorElement =>
					node instanceof HTMLAnchorElement && node.href.startsWith('mailto:'),
			);
		expect(appendedAnchor).toBeDefined();
		expect(mockClick).toHaveBeenCalledTimes(1);
		expect(removeSpy.mock.calls.some(([node]) => node === appendedAnchor)).toBe(
			true,
		);

		expect(
			screen.getByText(/An email draft has been opened/i),
		).toBeInTheDocument();
		expect(screen.getByText('cloud-support@signoz.io')).toBeInTheDocument();
		expect(screen.getByTestId('copy-email-template-btn')).toBeInTheDocument();
		expect(screen.getByTestId('retry-mailto-btn')).toBeInTheDocument();
	});

	it('copies email template to clipboard when Copy button is clicked', async () => {
		mockMailto();

		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<CancelSubscriptionBanner />);

		await user.click(
			screen.getByRole('button', { name: /cancel subscription/i }),
		);
		await user.type(screen.getByTestId('cancel-confirm-input'), 'cancel');
		await user.click(screen.getByTestId('cancel-subscription-confirm-btn'));

		await user.click(screen.getByTestId('copy-email-template-btn'));

		await waitFor(() =>
			expect(screen.getByTestId('copy-email-template-btn')).toHaveTextContent(
				'Copied!',
			),
		);
	});

	it('retry link is a native anchor with correct mailto href in fallback view', async () => {
		mockMailto();

		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<CancelSubscriptionBanner />);

		await user.click(
			screen.getByRole('button', { name: /cancel subscription/i }),
		);
		await user.type(screen.getByTestId('cancel-confirm-input'), 'cancel');
		await user.click(screen.getByTestId('cancel-subscription-confirm-btn'));

		const retryLink = screen.getByTestId('retry-mailto-btn');
		expect(retryLink.tagName).toBe('A');
		expect(retryLink).toHaveAttribute(
			'href',
			expect.stringContaining('mailto:cloud-support@signoz.io'),
		);
	});

	it('closes fallback view when Close is clicked and resets state', async () => {
		mockMailto();

		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<CancelSubscriptionBanner />);

		await user.click(
			screen.getByRole('button', { name: /cancel subscription/i }),
		);
		await user.type(screen.getByTestId('cancel-confirm-input'), 'cancel');
		await user.click(screen.getByTestId('cancel-subscription-confirm-btn'));

		await user.click(screen.getByRole('button', { name: /close/i }));
		await waitFor(() =>
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
		);
	});
});
