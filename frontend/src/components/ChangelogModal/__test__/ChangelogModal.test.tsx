/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { fireEvent, render, screen } from '@testing-library/react';
import {
	ChangelogSchema,
	ChangelogType,
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
			deployment_type: 'oss',
		},
	],
	bug_fixes: 'Bug fix details',
	maintenance: 'Maintenance details',
	// Add any other required fields with mock values as per ChangelogSchema definition
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
	useAppContext: jest.fn(() => ({ changelogToShow: ChangelogType.LATEST })),
}));

describe('ChangelogModal', () => {
	it('renders modal with changelog data', () => {
		render(<ChangelogModal changelog={mockChangelog} onClose={jest.fn()} />);
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
		render(<ChangelogModal changelog={mockChangelog} onClose={onClose} />);
		fireEvent.click(screen.getByText('Skip for now'));
		expect(onClose).toHaveBeenCalled();
	});

	it('opens migration docs when Update my workspace is clicked', () => {
		window.open = jest.fn();
		render(<ChangelogModal changelog={mockChangelog} onClose={jest.fn()} />);
		fireEvent.click(screen.getByText('Update my workspace'));
		expect(window.open).toHaveBeenCalledWith(
			'https://github.com/SigNoz/signoz/releases',
			'_blank',
			'noopener,noreferrer',
		);
	});

	it('scrolls for more when Scroll for more is clicked', () => {
		render(<ChangelogModal changelog={mockChangelog} onClose={jest.fn()} />);
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
