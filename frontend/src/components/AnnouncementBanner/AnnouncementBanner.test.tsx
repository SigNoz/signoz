import { render, screen, userEvent } from 'tests/test-utils';

import {
	AnnouncementBanner,
	AnnouncementBannerProps,
	PersistedAnnouncementBanner,
} from './index';

const STORAGE_KEY = 'test-banner-dismissed';

function renderBanner(props: Partial<AnnouncementBannerProps> = {}): void {
	render(<AnnouncementBanner message="Test message" {...props} />);
}

afterEach(() => {
	localStorage.removeItem(STORAGE_KEY);
});

describe('AnnouncementBanner', () => {
	it('renders message and default warning variant', () => {
		renderBanner({ message: <strong>Heads up</strong> });

		const alert = screen.getByRole('alert');
		expect(alert).toHaveClass('announcement-banner--warning');
		expect(alert).toHaveTextContent('Heads up');
	});

	it.each(['warning', 'info', 'success', 'error'] as const)(
		'renders %s variant correctly',
		(type) => {
			renderBanner({ type, message: 'Test message' });
			const alert = screen.getByRole('alert');
			expect(alert).toHaveClass(`announcement-banner--${type}`);
		},
	);

	it('calls action onClick when action button is clicked', async () => {
		const onClick = jest.fn() as jest.MockedFunction<() => void>;
		renderBanner({ action: { label: 'Go to Settings', onClick } });

		const user = userEvent.setup({ pointerEventsCheck: 0 });
		await user.click(screen.getByRole('button', { name: /go to settings/i }));

		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('hides dismiss button when onClose is not provided and hides icon when icon is null', () => {
		renderBanner({ onClose: undefined, icon: null });

		expect(
			screen.queryByRole('button', { name: /dismiss/i }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('alert')?.querySelector('.announcement-banner__icon'),
		).not.toBeInTheDocument();
	});
});

describe('PersistedAnnouncementBanner', () => {
	it('dismisses on click, calls onDismiss, and persists to localStorage', async () => {
		const onDismiss = jest.fn() as jest.MockedFunction<() => void>;
		render(
			<PersistedAnnouncementBanner
				message="Test message"
				storageKey={STORAGE_KEY}
				onDismiss={onDismiss}
			/>,
		);

		const user = userEvent.setup({ pointerEventsCheck: 0 });
		await user.click(screen.getByRole('button', { name: /dismiss/i }));

		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
		expect(onDismiss).toHaveBeenCalledTimes(1);
		expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
	});

	it('does not render when storageKey is already set in localStorage', () => {
		localStorage.setItem(STORAGE_KEY, 'true');
		render(
			<PersistedAnnouncementBanner
				message="Test message"
				storageKey={STORAGE_KEY}
			/>,
		);

		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});
});
