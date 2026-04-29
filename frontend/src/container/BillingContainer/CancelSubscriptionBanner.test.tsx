import { render, screen, userEvent } from 'tests/test-utils';

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
			screen.getByText('Cancel Subscription', { selector: 'span' }),
		).toBeInTheDocument();
		expect(
			screen.getByText('Cancel your SigNoz subscription.'),
		).toBeInTheDocument();
	});

	it('opens dialog with correct content when Cancel Subscription is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<CancelSubscriptionBanner />);

		await user.click(
			screen.getByRole('button', { name: /cancel subscription/i }),
		);

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(
			screen.getByText(/reach out to our support team/i),
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /keep subscription/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /contact support/i }),
		).toBeInTheDocument();
	});

	it('sends mailto to cloud-support with correct subject on Contact Support', async () => {
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
		await user.click(screen.getByRole('button', { name: /contact support/i }));

		expect(mockAnchor.href).toContain('mailto:cloud-support@signoz.io');
		expect(mockAnchor.href).toContain('Cancel%20My%20SigNoz%20Subscription');
		expect(mockClick).toHaveBeenCalledTimes(1);

		jest.restoreAllMocks();
	});
});
