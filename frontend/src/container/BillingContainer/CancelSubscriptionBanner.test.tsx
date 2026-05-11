import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import CancelSubscriptionBanner from './CancelSubscriptionBanner';

jest.mock('utils/basePath', () => ({
	getBasePath: (): string => '/',
	withBasePath: (path: string): string => path,
	getAbsoluteUrl: (path: string): string => `https://test.signoz.io${path}`,
	getBaseUrl: (): string => 'https://test.signoz.io',
}));

describe('CancelSubscriptionBanner', () => {
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
		expect(
			screen.getByPlaceholderText(/Enter the word cancel/i),
		).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /cancel subscription/i }),
		).toBeInTheDocument();
	});

	it('keeps Cancel subscription button disabled until "cancel" is typed', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<CancelSubscriptionBanner />);

		await user.click(
			screen.getByRole('button', { name: /cancel subscription/i }),
		);

		const confirmButton = screen.getByRole('button', {
			name: /cancel subscription/i,
		});
		expect(confirmButton).toBeDisabled();

		const input = screen.getByPlaceholderText(/Enter the word cancel/i);
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

		const input = screen.getByPlaceholderText(/Enter the word cancel/i);
		await user.type(input, 'cancel');

		await user.click(screen.getByRole('button', { name: /go back/i }));
		await waitFor(() =>
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
		);

		await user.click(
			screen.getByRole('button', { name: /cancel subscription/i }),
		);
		expect(screen.getByPlaceholderText(/Enter the word cancel/i)).toHaveValue('');
	});

	it('sends mailto to cloud-support with correct subject after typing "cancel"', async () => {
		const realCreateElement = document.createElement.bind(document);
		const mockClick = jest.fn();
		const mockAnchor = { href: '', click: mockClick };
		jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
			if (tag === 'a') {
				return mockAnchor as unknown as HTMLAnchorElement;
			}
			return realCreateElement(tag);
		});

		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<CancelSubscriptionBanner />);

		await user.click(
			screen.getByRole('button', { name: /cancel subscription/i }),
		);

		const input = screen.getByPlaceholderText(/Enter the word cancel/i);
		await user.type(input, 'cancel');

		await user.click(
			screen.getByRole('button', { name: /cancel subscription/i }),
		);

		expect(mockAnchor.href).toContain('mailto:cloud-support@signoz.io');
		expect(mockAnchor.href).toContain('Cancel%20My%20SigNoz%20Subscription');
		expect(mockClick).toHaveBeenCalledTimes(1);

		jest.restoreAllMocks();
	});
});
