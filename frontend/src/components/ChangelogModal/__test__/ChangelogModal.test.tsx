/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { fireEvent, render, screen } from '@testing-library/react';
import { USER_PREFERENCES } from 'constants/userPreferences';
import MockQueryClientProvider from 'providers/test/MockQueryClientProvider';
import {
	ChangelogSchema,
	DeploymentType,
} from 'types/api/changelog/getChangelogByVersion';

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
		function ReactMarkdown({ children }: any) {
			return <div>{children}</div>;
		},
);
// mock useAppContext
jest.mock('providers/App/App', () => ({
	useAppContext: jest.fn(() => ({
		updateUserPreferenceInContext: jest.fn(),
		userPreferences: [
			{
				name: USER_PREFERENCES.LAST_SEEN_CHANGELOG_VERSION,
				value: 'v1.0.0',
			},
		],
	})),
}));

function renderChangelog(onClose: () => void = jest.fn()): void {
	render(
		<MockQueryClientProvider>
			<ChangelogModal changelog={mockChangelog} onClose={onClose} />
		</MockQueryClientProvider>,
	);
}

describe('ChangelogModal', () => {
	it('renders modal with changelog data', () => {
		renderChangelog();
		expect(
			screen.getByText('What’s New ⎯ Changelog : June 10, 2025'),
		).toBeInTheDocument();
		expect(screen.getByText('Feature 1')).toBeInTheDocument();
		expect(screen.getByText('Description for feature 1')).toBeInTheDocument();
		expect(screen.getByText('Bug fix details')).toBeInTheDocument();
		expect(screen.getByText('Maintenance details')).toBeInTheDocument();
	});

	it('calls onClose when Skip for now is clicked', () => {
		const onClose = jest.fn();
		renderChangelog(onClose);
		fireEvent.click(screen.getByText('Skip for now'));
		expect(onClose).toHaveBeenCalled();
	});

	it('opens migration docs when Update my workspace is clicked', () => {
		window.open = jest.fn();
		renderChangelog();
		fireEvent.click(screen.getByText('Update my workspace'));
		expect(window.open).toHaveBeenCalledWith(
			'https://signoz.io/upgrade-path',
			'_blank',
			'noopener,noreferrer',
		);
	});

	it('scrolls for more when Scroll for more is clicked', () => {
		renderChangelog();
		const scrollBtn = screen.getByTestId('scroll-more-btn');
		const contentDiv = screen.getByTestId('changelog-content');
		if (contentDiv) {
			contentDiv.scrollTo = jest.fn();
		}
		fireEvent.click(scrollBtn);
		if (contentDiv) {
			expect(contentDiv.scrollTo).toHaveBeenCalled();
		}
	});
});
