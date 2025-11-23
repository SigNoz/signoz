import { render, userEvent, waitFor } from 'tests/test-utils';

import BodyTitleRenderer from '../BodyTitleRenderer';

// Mock hooks
let mockSetCopy: jest.Mock;
const mockNotification = jest.fn();

jest.mock('hooks/logs/useActiveLog', () => ({
	useActiveLog: (): any => ({
		onAddToQuery: jest.fn(),
	}),
}));

jest.mock('react-use', () => ({
	useCopyToClipboard: (): any => {
		mockSetCopy = jest.fn();
		return [{ value: null }, mockSetCopy];
	},
}));

jest.mock('hooks/useNotifications', () => ({
	useNotifications: (): any => ({
		notifications: {
			success: mockNotification,
			error: jest.fn(),
			info: jest.fn(),
			warning: jest.fn(),
			open: jest.fn(),
			destroy: jest.fn(),
		},
	}),
}));

const COPY_ICON_SELECTOR = '[role="img"][aria-label="copy"]';

describe('BodyTitleRenderer', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should display copy button with hover-reveal styling', async () => {
		const { container } = render(
			<BodyTitleRenderer
				title="name"
				nodeKey="user.name"
				value="John"
				parentIsArray={false}
			/>,
		);

		// Find the copy icon - it should be in the DOM with hover-reveal class
		const copyIcon = container.querySelector(COPY_ICON_SELECTOR) as HTMLElement;

		expect(copyIcon).toBeInTheDocument();
		// Copy icon should have the hover-reveal class (visibility controlled by CSS on parent hover)
		expect(copyIcon).toHaveClass('hover-reveal');
		// Verify it's an Ant Design copy icon
		expect(copyIcon.getAttribute('aria-label')).toBe('copy');
	});

	it('should copy object key-value pair to clipboard when copy button clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		const { container } = render(
			<BodyTitleRenderer
				title="name"
				nodeKey="user.name"
				value="John"
				parentIsArray={false}
			/>,
		);

		const copyIcon = container.querySelector(COPY_ICON_SELECTOR) as HTMLElement;

		if (copyIcon) {
			await user.click(copyIcon);

			await waitFor(() => {
				expect(mockSetCopy).toHaveBeenCalledWith('"user.name": "John"');
			});
		}
	});

	it('should copy only value for array elements', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		const { container } = render(
			<BodyTitleRenderer
				title="0"
				nodeKey="items[*].0"
				value="arrayElement"
				parentIsArray
			/>,
		);

		const copyIcon = container.querySelector(COPY_ICON_SELECTOR) as HTMLElement;

		if (copyIcon) {
			await user.click(copyIcon);

			await waitFor(() => {
				expect(mockSetCopy).toHaveBeenCalledWith('arrayElement');
			});
		}
	});

	it('should show notification with immediate key name after copy', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		const { container } = render(
			<BodyTitleRenderer
				title="name"
				nodeKey="service_meta.name"
				value="metaValue"
				parentIsArray={false}
			/>,
		);

		const copyIcon = container.querySelector(COPY_ICON_SELECTOR) as HTMLElement;

		if (copyIcon) {
			await user.click(copyIcon);

			await waitFor(() => {
				expect(mockNotification).toHaveBeenCalledWith(
					expect.objectContaining({
						message: expect.stringContaining('service_meta.name'),
					}),
				);
			});
		}
	});
});
