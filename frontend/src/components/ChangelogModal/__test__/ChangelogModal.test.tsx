import { ReactNode } from 'react';
import { USER_PREFERENCES } from 'constants/userPreferences';
import { IAppContext } from 'providers/App/types';
import {
	fireEvent,
	getAppContextMock,
	render,
	screen,
	userEvent,
	waitFor,
} from 'tests/test-utils';
import {
	ChangelogSchema,
	DeploymentType,
} from 'types/api/changelog/getChangelogByVersion';
import {
	LicensePlatform,
	LicenseResModel,
} from 'types/api/licensesV3/getActive';

import ChangelogModal from '../ChangelogModal';

const mockChangelog: ChangelogSchema = {
	id: 1,
	documentId: 'doc-1',
	version: 'v1.0.0',
	createdAt: '2025-06-09T12:00:00Z',
	updatedAt: '2025-06-09T13:00:00Z',
	publishedAt: '2025-06-09T14:00:00Z',
	release_date: '2025-06-10',
	features: [
		{
			id: 1,
			title: 'Feature 1',
			description: 'Description for feature 1',
			media: null,
			documentId: 'feature-1',
			sort_order: 1,
			createdAt: '2025-06-09T12:00:00Z',
			updatedAt: '2025-06-09T13:00:00Z',
			publishedAt: '2025-06-09T14:00:00Z',
			deployment_type: DeploymentType.ALL,
		},
	],
	bug_fixes: 'Bug fix details',
	maintenance: 'Maintenance details',
};

// Mock react-markdown to just render children as plain text
jest.mock(
	'react-markdown',
	() =>
		function ReactMarkdown({ children }: { children: ReactNode }): JSX.Element {
			return <div>{children}</div>;
		},
);

const selfHostedContext: Partial<IAppContext> = {
	activeLicense: {
		...(getAppContextMock('ADMIN').activeLicense as LicenseResModel),
		platform: LicensePlatform.SELF_HOSTED,
	},
};

function renderChangelog(
	onClose: () => void = jest.fn(),
	appContextOverrides: Partial<IAppContext> = {},
): void {
	render(
		<ChangelogModal changelog={mockChangelog} onClose={onClose} />,
		undefined,
		{
			appContextOverrides: {
				userPreferences: [
					{
						name: USER_PREFERENCES.LAST_SEEN_CHANGELOG_VERSION,
						value: 'v1.0.0',
					},
				] as IAppContext['userPreferences'],
				...appContextOverrides,
			},
		},
	);
}

describe('ChangelogModal', () => {
	it('renders the dialog with the changelog data', async () => {
		renderChangelog();

		await expect(
			screen.findByTestId('changelog-dialog-title'),
		).resolves.toHaveTextContent('What’s New ⎯ Changelog : June 10, 2025');
		expect(screen.getByText('Feature 1')).toBeInTheDocument();
		expect(screen.getByText('Description for feature 1')).toBeInTheDocument();
		expect(screen.getByText('Bug fix details')).toBeInTheDocument();
		expect(screen.getByText('Maintenance details')).toBeInTheDocument();
	});

	it('calls onClose when the close button is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onClose = jest.fn();
		renderChangelog(onClose);

		await user.click(await screen.findByTestId('changelog-dialog-close'));

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('offers no upgrade actions to a cloud workspace', async () => {
		renderChangelog();

		await screen.findByTestId('changelog-content');

		expect(
			screen.queryByTestId('changelog-dialog-footer'),
		).not.toBeInTheDocument();
		expect(screen.queryByTestId('changelog-skip-btn')).not.toBeInTheDocument();
		expect(screen.queryByTestId('changelog-update-btn')).not.toBeInTheDocument();
	});

	it('calls onClose when Skip for now is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onClose = jest.fn();
		renderChangelog(onClose, selfHostedContext);

		await user.click(await screen.findByTestId('changelog-skip-btn'));

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('opens migration docs when Update my workspace is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const open = jest.spyOn(window, 'open').mockImplementation(() => null);
		renderChangelog(jest.fn(), selfHostedContext);

		await user.click(await screen.findByTestId('changelog-update-btn'));

		expect(open).toHaveBeenCalledWith(
			'https://signoz.io/upgrade-path',
			'_blank',
			'noopener,noreferrer',
		);
		open.mockRestore();
	});

	describe('scroll for more', () => {
		let scrollHeight: jest.SpyInstance;
		let clientHeight: jest.SpyInstance;

		beforeEach(() => {
			scrollHeight = jest.spyOn(Element.prototype, 'scrollHeight', 'get');
			clientHeight = jest.spyOn(Element.prototype, 'clientHeight', 'get');
		});

		afterEach(() => {
			scrollHeight.mockRestore();
			clientHeight.mockRestore();
		});

		it('is hidden while the content fits', async () => {
			scrollHeight.mockReturnValue(400);
			clientHeight.mockReturnValue(400);
			renderChangelog();

			await screen.findByTestId('changelog-content');

			expect(screen.queryByTestId('scroll-more-btn')).not.toBeInTheDocument();
		});

		it('scrolls 600px further from the current position when clicked', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			scrollHeight.mockReturnValue(2000);
			clientHeight.mockReturnValue(400);
			renderChangelog();

			const content = await screen.findByTestId('changelog-content');
			Object.defineProperty(content, 'scrollTop', {
				value: 100,
				configurable: true,
			});
			const scrollTo = jest.fn();
			Object.defineProperty(content, 'scrollTo', { value: scrollTo });
			await user.click(await screen.findByTestId('scroll-more-btn'));

			expect(scrollTo).toHaveBeenCalledWith({
				top: 700,
				behavior: 'smooth',
			});
		});

		it('hides once the content is scrolled to the bottom', async () => {
			scrollHeight.mockReturnValue(1000);
			clientHeight.mockReturnValue(400);
			renderChangelog();

			const content = await screen.findByTestId('changelog-content');
			await screen.findByTestId('scroll-more-btn');
			Object.defineProperty(content, 'scrollTop', {
				value: 600,
				configurable: true,
			});
			fireEvent.scroll(content);

			await waitFor(() =>
				expect(screen.queryByTestId('scroll-more-btn')).not.toBeInTheDocument(),
			);
		});
	});
});
